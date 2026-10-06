"""Persistent, immutable dataset versions and their matching RAG indexes."""
import io
import json
import math
import os
import re
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from fastapi import HTTPException


OUTPUT_DIR = Path(__file__).resolve().parents[2] / "preprocessing" / "output"


class DatasetService:
    def __init__(self, output_dir=OUTPUT_DIR):
        self.output_dir = Path(output_dir)
        self.catalog_path = self.output_dir / "datasets.json"
        self._lock = threading.RLock()

    @contextmanager
    def _writer(self):
        """Serialize writers across threads and API worker processes."""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        with self._lock, (self.output_dir / ".datasets.lock").open("a+b") as handle:
            handle.seek(0)
            if not handle.read(1):
                handle.write(b"0")
            handle.flush()
            handle.seek(0)
            if os.name == "nt":
                import msvcrt
                try:
                    msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, 1)
                except OSError as exc:
                    raise HTTPException(503, "Another dataset update is still processing. Please retry shortly.") from exc
            else:
                import fcntl
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
            try:
                yield
            finally:
                handle.seek(0)
                if os.name == "nt":
                    msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

    def _catalog(self):
        if self.catalog_path.exists():
            return json.loads(self.catalog_path.read_text(encoding="utf-8"))
        return {"datasets": {}, "activeDatasetId": None, "importedFiles": []}

    @staticmethod
    def _write_json(path, value):
        temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
        try:
            temporary.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False), encoding="utf-8")
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)

    @staticmethod
    def parse_file(content, filename):
        from api.utils.validation import validate_excel_file
        validate_excel_file(filename)
        try:
            df = pd.read_csv(io.BytesIO(content)) if filename.lower().endswith(".csv") else pd.read_excel(io.BytesIO(content))
        except Exception as exc:
            raise HTTPException(400, "Cannot read this file as a spreadsheet or CSV.") from exc
        df.columns = [str(c).strip() for c in df.columns]
        if not len(df.columns) or len(set(df.columns)) != len(df.columns):
            raise HTTPException(400, "Dataset must have unique, non-empty column names.")
        if any(not c or c == "__rowId" for c in df.columns):
            raise HTTPException(400, "Invalid or reserved column name: __rowId.")
        return df

    @staticmethod
    def _safe_name(filename):
        name = str(filename or "").replace("\\", "/").split("/")[-1]
        stem = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", Path(name).stem).strip(" .")
        # A frontend upload named Sales_V2 belongs to the Sales dataset.
        stem = re.sub(r"_V\d+$", "", stem, flags=re.IGNORECASE)
        if not stem or stem.upper() in {"CON", "PRN", "AUX", "NUL", *[f"COM{i}" for i in range(1, 10)], *[f"LPT{i}" for i in range(1, 10)]}:
            raise HTTPException(400, "Please use a valid dataset filename.")
        return stem[:120], Path(name).suffix.lower()

    @staticmethod
    def _columns(df):
        return [{"name": c, "type": "number" if pd.api.types.is_numeric_dtype(df[c]) else
                 "date" if pd.api.types.is_datetime64_any_dtype(df[c]) else "string",
                 "required": False} for c in df.columns]

    def _snapshot(self, entry, version=None):
        number = entry["currentVersion"] if version is None else version
        if not any(v["version"] == number for v in entry["versions"]):
            raise HTTPException(404, "Dataset version not found.")
        path = self.output_dir / entry["folder"] / f".version_{number}.json"
        return json.loads(path.read_text(encoding="utf-8"))

    @staticmethod
    def _entry(catalog, dataset_id):
        entry = catalog["datasets"].get(dataset_id)
        if entry is None:
            raise HTTPException(404, "Dataset not found.")
        return entry

    def _item(self, entry, active_id=None):
        snap = self._snapshot(entry)
        version = next(v for v in entry["versions"] if v["version"] == entry["currentVersion"])
        return {"id": entry["id"], "name": entry["name"], "description": "Uploaded dataset",
                "rowCount": len(snap["rows"]), "columnCount": len(snap["columns"]),
                "columns": snap["columns"], "lastUpdated": entry["updatedAt"],
                "format": Path(version["filename"]).suffix[1:], "source": "File upload",
                "sizeBytes": (self.output_dir / entry["folder"] / version["filename"]).stat().st_size,
                "status": "Ready", "currentVersion": entry["currentVersion"],
                "currentFilename": version["filename"], "versions": entry["versions"],
                "embeddingStatus": snap["embeddingStatus"], "embeddingCount": snap["embeddingCount"],
                "hanaSyncStatus": snap.get("hanaSyncStatus", "Pending"),
                "isActive": entry["id"] == active_id}

    def _chunks(self, df, filename, rows):
        """Preserve exact values and include authoritative whole-dataset totals."""
        numeric = df.select_dtypes(include="number")
        totals = {c: float(numeric[c].sum()) for c in numeric if math.isfinite(float(numeric[c].sum()))}
        chunks = [f"Source: {filename}. Overall dataset: {len(rows)} rows. Columns: {', '.join(df.columns)}. Numeric column totals: {json.dumps(totals)}"]
        buffer = ""
        header = f"Source: {filename}. Columns (each row follows this order): {json.dumps(list(df.columns))}\n"
        for row in rows:
            text = json.dumps([row.get(c) for c in df.columns], ensure_ascii=False)
            if buffer and len(buffer) + len(text) > 3500:
                chunks.append(header + buffer)
                buffer = ""
            buffer += text + "\n"
        if buffer:
            chunks.append(header + buffer)
        return chunks

    def _index(self, chunks, previous=None):
        from api.services.embedding_service import embedding_service
        from api.utils.logger import get_logger
        try:
            reusable = dict(zip(previous["chunks"], previous["embeddings"])) if previous and previous["embeddingStatus"] == "Ready" else {}
            missing = list(dict.fromkeys(chunk for chunk in chunks if chunk not in reusable))
            if missing:
                reusable.update(zip(missing, embedding_service.batch_embeddings(missing)))
            vectors = [reusable[chunk] for chunk in chunks]
            if len(vectors) != len(chunks) or any(not v or not all(math.isfinite(x) for x in v) for v in vectors):
                raise ValueError("Embedding provider returned invalid vectors")
            return vectors, "Ready"
        except Exception:
            get_logger("datasets").exception("Embedding generation failed; current source text remains available for retrieval")
            return [], "Error"

    @staticmethod
    def _sync_hana(entry, number, chunks, vectors):
        if not vectors:
            return "Pending"
        from api.utils.logger import get_logger
        try:
            from api.database.vector_client import vector_client
            vector_client.replace_dataset_version(entry["id"], number, chunks, vectors, entry["name"])
            return "Ready"
        except Exception:
            get_logger("datasets").exception("HANA sync failed; using the persistent version index for retrieval")
            return "Error"

    def _save_version(self, catalog, entry, df, rows, operation, original=None, index=True, extension=None):
        folder = self.output_dir / entry["folder"]
        folder.mkdir(parents=True, exist_ok=True)
        # Include orphaned staged files when allocating, so a failed write is never overwritten.
        number = max([v["version"] for v in entry["versions"]] +
                     [int(p.stem.split("_")[-1]) for p in folder.glob(".version_*.json")] + [0]) + 1
        suffix = extension or Path(entry["name"]).suffix.lower()
        # Write edited legacy XLS content as XLSX; openpyxl cannot write XLS.
        if suffix == ".xls" and original is None:
            suffix = ".xlsx"
        filename = f"{entry['folder']}{'' if number == 1 else f'_V{number}'}{suffix}"
        path = folder / filename
        chunks = self._chunks(df, entry["name"], rows)
        previous = self._snapshot(entry) if entry["versions"] else None
        vectors, embedding_status = self._index(chunks, previous) if index else ([], "Pending")
        hana_status = self._sync_hana(entry, number, chunks, vectors)
        if original is not None:
            path.write_bytes(original)
        elif suffix == ".csv":
            df.to_csv(path, index=False)
        else:
            df.to_excel(path, index=False)
        snap = {"rows": rows, "columns": self._columns(df), "chunks": chunks,
                "embeddings": vectors, "embeddingCount": len(vectors), "embeddingStatus": embedding_status,
                "hanaSyncStatus": hana_status}
        self._write_json(folder / f".version_{number}.json", snap)
        now = datetime.now(timezone.utc).isoformat()
        entry["versions"].append({"version": number, "filename": filename, "createdAt": now,
                                  "rowCount": len(rows), "operation": operation})
        entry.update(currentVersion=number, updatedAt=now)
        catalog["datasets"][entry["id"]] = entry
        catalog["activeDatasetId"] = entry["id"]
        self._write_json(self.catalog_path, catalog)
        self._invalidate()
        item = self._item(entry, entry["id"])
        warning = " Embeddings could not be generated; chat uses current source text. Retry indexing when the embedding service is available." if embedding_status == "Error" else ""
        if hana_status == "Error":
            warning += " HANA sync is unavailable; chat uses the saved version embeddings."
        return {"success": True, "message": f"Saved {filename} ({len(rows)} rows)." + warning,
                "dataset": item, "version": number, "embeddings_generated": len(vectors)}

    @staticmethod
    def _rows(df):
        rows = json.loads(df.to_json(orient="records", date_format="iso", double_precision=15))
        for row in rows:
            row["__rowId"] = uuid.uuid4().hex
        return rows

    @staticmethod
    def _frame(rows, columns):
        return pd.DataFrame([{c["name"]: r.get(c["name"]) for c in columns} for r in rows], columns=[c["name"] for c in columns])

    @staticmethod
    def _invalidate():
        # Disk is authoritative, including after restart or a change by another worker.
        from api.services.excel_dataset_service import excel_dataset_service
        from api.services.schema_service import schema_service
        excel_dataset_service._df = None
        schema_service._metadata = None
        from api.services.vector_service import vector_service
        vector_service.clear_cache()

    def _import_legacy(self):
        catalog = self._catalog()
        if not self.output_dir.exists():
            return
        pending = [p for p in self.output_dir.iterdir() if p.is_file() and p.suffix.lower() in {".csv", ".xlsx", ".xls"}
                   and not p.name.startswith("~$") and p.name not in catalog["importedFiles"]]
        if not pending:
            return
        with self._writer():
            catalog = self._catalog()
            changed = False
            for path in sorted(self.output_dir.iterdir()):
                if not path.is_file() or path.suffix.lower() not in {".csv", ".xlsx", ".xls"} or path.name.startswith("~$") or path.name in catalog["importedFiles"]:
                    continue
                df = self.parse_file(path.read_bytes(), path.name)
                stem, suffix = self._safe_name(path.name)
                entry = next((d for d in catalog["datasets"].values() if d["folder"].casefold() == stem.casefold()), None)
                if entry is None:
                    entry = {"id": "ds-" + uuid.uuid4().hex, "folder": stem, "name": stem + suffix, "versions": []}
                    self._save_version(catalog, entry, df, self._rows(df), "import", path.read_bytes(), index=False)
                catalog["importedFiles"].append(path.name)
                changed = True
            if changed:
                self._write_json(self.catalog_path, catalog)

    def list_datasets(self):
        self._import_legacy()
        catalog = self._catalog()
        return [self._item(e, catalog["activeDatasetId"]) for e in catalog["datasets"].values()]

    def upload(self, content, filename):
        df = self.parse_file(content, filename)
        stem, suffix = self._safe_name(filename)
        with self._writer():
            catalog = self._catalog()
            entry = next((d for d in catalog["datasets"].values() if d["folder"].casefold() == stem.casefold()), None)
            if entry is None:
                entry = {"id": "ds-" + uuid.uuid4().hex, "folder": stem, "name": stem + suffix, "versions": []}
            # Re-upload is a complete replacement snapshot; append has its own endpoint.
            return self._save_version(catalog, entry, df, self._rows(df), "upload", content, extension=suffix)

    def data(self, dataset_id, page=1, page_size=10, sort_field=None, sort_dir="asc", search=""):
        catalog = self._catalog()
        entry = self._entry(catalog, dataset_id)
        snap = self._snapshot(entry)
        rows = [dict(r, id=r["__rowId"]) if "id" not in r else dict(r) for r in snap["rows"]]
        if search.strip():
            visible_columns = [c["name"] for c in snap["columns"]]
            rows = [r for r in rows if any(search.strip().casefold() in str(r.get(c, "")).casefold() for c in visible_columns)]
        if sort_field:
            if sort_field not in {c["name"] for c in snap["columns"]}:
                raise HTTPException(400, "Unknown sort column.")
            rows = sorted(rows, key=lambda r: (r.get(sort_field) is None,
                          0 if isinstance(r.get(sort_field), (int, float)) else 1,
                          r.get(sort_field) if isinstance(r.get(sort_field), (int, float)) else str(r.get(sort_field, ""))), reverse=sort_dir == "desc")
        return {"dataset": self._item(entry, catalog["activeDatasetId"]), "rows": rows[(page-1)*page_size:page*page_size],
                "totalRows": len(rows), "page": page, "pageSize": page_size, "totalPages": max(1, math.ceil(len(rows)/page_size))}

    def mutate(self, dataset_id, operation, payload):
        with self._writer():
            catalog = self._catalog()
            entry = self._entry(catalog, dataset_id)
            snap = self._snapshot(entry)
            rows, columns = snap["rows"], snap["columns"]
            names = {c["name"] for c in columns}
            if operation == "append":
                if not payload:
                    raise HTTPException(400, "No rows to append.")
                for incoming in payload:
                    unknown = set(incoming) - names - {"id", "__rowId"}
                    missing = names - set(incoming)
                    if unknown or missing:
                        raise HTTPException(400, f"Schema mismatch. Missing: {sorted(missing)}; extra: {sorted(unknown)}")
                    rows.append({**{k: incoming.get(k) for k in names}, "__rowId": uuid.uuid4().hex})
            else:
                lookup = {r["__rowId"]: r for r in rows}
                ids = [r.get("__rowId", r.get("id")) for r in payload] if operation == "edit" else payload
                if not ids or len(set(ids)) != len(ids) or any(i not in lookup for i in ids):
                    raise HTTPException(400, "Select valid, unique row IDs.")
                if operation == "edit":
                    for incoming, row_id in zip(payload, ids):
                        if set(incoming) - names - {"id", "__rowId"}:
                            raise HTTPException(400, "Unknown dataset column.")
                        lookup[row_id].update({k: v for k, v in incoming.items() if k in names})
                elif operation == "delete_rows":
                    rows = [r for r in rows if r["__rowId"] not in set(ids)]
            df = self._frame(rows, columns)
            for col in columns:
                if col["type"] == "number":
                    try:
                        df[col["name"]] = pd.to_numeric(df[col["name"]], errors="raise")
                    except (ValueError, TypeError) as exc:
                        raise HTTPException(400, f"{col['name']} must be numeric.") from exc
            # Normalize numeric types while keeping stable row IDs.
            normalized = json.loads(df.to_json(orient="records", date_format="iso", double_precision=15))
            for row, previous in zip(normalized, rows):
                row["__rowId"] = previous["__rowId"]
            result = self._save_version(catalog, entry, df, normalized, operation)
            result.update(rowsUpdated=len(payload), rowsAppended=len(payload), totalRows=len(rows), remainingRows=len(rows))
            return result

    def restore(self, dataset_id, version):
        with self._writer():
            catalog = self._catalog()
            entry = self._entry(catalog, dataset_id)
            self._snapshot(entry, version)  # Validate before publishing the pointer.
            entry.update(currentVersion=version, updatedAt=datetime.now(timezone.utc).isoformat())
            catalog["activeDatasetId"] = dataset_id
            self._write_json(self.catalog_path, catalog)
            self._invalidate()
            return {"success": True, "message": f"Restored version {version}. Analytics and chat now use this version.",
                    "dataset": self._item(entry, dataset_id)}

    def activate(self, dataset_id):
        catalog = self._catalog()
        entry = self._entry(catalog, dataset_id)
        return self.restore(dataset_id, entry["currentVersion"])

    def reindex(self, dataset_id):
        with self._writer():
            catalog = self._catalog()
            entry = self._entry(catalog, dataset_id)
            snap = self._snapshot(entry)
            vectors, status = self._index(snap["chunks"])
            if status != "Ready":
                raise HTTPException(503, "Embedding service unavailable. Dataset is still saved; please retry.")
            snap.update(embeddings=vectors, embeddingCount=len(vectors), embeddingStatus=status)
            snap["hanaSyncStatus"] = self._sync_hana(entry, entry["currentVersion"], snap["chunks"], vectors)
            self._write_json(self.output_dir / entry["folder"] / f".version_{entry['currentVersion']}.json", snap)
            self._invalidate()
            message = "Current version embeddings refreshed."
            if snap["hanaSyncStatus"] == "Error":
                message += " HANA sync unavailable; chat uses saved version embeddings."
            return {"success": True, "message": message, "dataset": self._item(entry, catalog["activeDatasetId"])}

    def delete(self, dataset_id):
        with self._writer():
            catalog = self._catalog()
            self._entry(catalog, dataset_id)
            del catalog["datasets"][dataset_id]
            if catalog["activeDatasetId"] == dataset_id:
                catalog["activeDatasetId"] = next(iter(catalog["datasets"]), None)
            self._write_json(self.catalog_path, catalog)
            self._invalidate()
            # Retain immutable files for recovery; deleted datasets are excluded from retrieval.
            return {"success": True, "message": "Dataset removed from analytics and chat."}

    def active(self):
        catalog = self._catalog()
        entry = catalog["datasets"].get(catalog["activeDatasetId"])
        return (entry, self._snapshot(entry)) if entry else (None, None)

    def active_path(self):
        catalog = self._catalog()
        entry = catalog["datasets"].get(catalog["activeDatasetId"])
        if not entry:
            return None
        version = next(v for v in entry["versions"] if v["version"] == entry["currentVersion"])
        return self.output_dir / entry["folder"] / version["filename"]

    def search(self, query, top_k):
        """Search only the selected version, never an obsolete or deleted index."""
        entry, snap = self.active()
        if not entry:
            return []
        scores = None
        used_embeddings = False
        if snap["embeddingStatus"] == "Ready":
            from api.services.embedding_service import embedding_service
            try:
                vector = embedding_service.get_embedding(query)
                if not vector or any(len(v) != len(vector) for v in snap["embeddings"]):
                    raise ValueError("Query embedding dimension does not match this index")
                norm = math.sqrt(sum(x*x for x in vector)) or 1
                scores = [sum(x*y for x, y in zip(vector, v)) / (norm * (math.sqrt(sum(x*x for x in v)) or 1)) for v in snap["embeddings"]]
                used_embeddings = True
                if snap.get("hanaSyncStatus") == "Ready":
                    from api.database.vector_client import vector_client
                    results = vector_client.search_dataset_version(entry["id"], entry["currentVersion"], vector, top_k)
                    if results:
                        summary_id = f"{entry['id']}:v{entry['currentVersion']}:0"
                        if not any(r["ID"] == summary_id for r in results):
                            results = [{"ID": summary_id, "TEXT_CHUNK": snap["chunks"][0], "SCORE": scores[0],
                                        "METADATA": json.dumps({"source": entry["name"], "version": entry["currentVersion"], "dataset_id": entry["id"]})}] + results[:max(0, top_k-1)]
                        return results
            except Exception:
                pass
        if scores is None:
            words = set(re.findall(r"\w+", query.casefold()))
            scores = [len(words & set(re.findall(r"\w+", chunk.casefold()))) for chunk in snap["chunks"]]
        indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
        # Always include the authoritative overall summary.
        if 0 not in indices:
            indices = [0] + indices[:max(0, top_k-1)]
        return [{"ID": f"{entry['id']}:v{entry['currentVersion']}:{i}", "TEXT_CHUNK": snap["chunks"][i],
                 "SCORE": scores[i], "METADATA": json.dumps({"source": entry["name"], "dataset_id": entry["id"],
                 "version": entry["currentVersion"], "retrieval": "embedding" if used_embeddings else "source_text"})} for i in indices]


dataset_service = DatasetService()
