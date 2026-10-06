import json
from typing import Any, Literal
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from api.services.dataset_service import dataset_service
from starlette.concurrency import run_in_threadpool

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

class RowsPayload(BaseModel):
    rows: list[dict[str, Any]] = Field(min_length=1)

class DeleteRowsPayload(BaseModel):
    rowIds: list[str] = Field(min_length=1)

class RollbackPayload(BaseModel):
    version: int = Field(ge=1)

@router.get("")
def list_datasets():
    return dataset_service.list_datasets()

@router.get("/{dataset_id}/data")
def dataset_data(dataset_id: str, page: int = Query(1, ge=1), pageSize: int = Query(10, ge=1, le=1000),
                 sortField: str | None = None, sortDir: Literal["asc", "desc"] = "asc", search: str = ""):
    return dataset_service.data(dataset_id, page, pageSize, sortField, sortDir, search)

@router.put("/{dataset_id}/rows")
def update_rows(dataset_id: str, payload: RowsPayload):
    return dataset_service.mutate(dataset_id, "edit", payload.rows)

@router.post("/{dataset_id}/append")
async def append_rows(dataset_id: str, rows: str = Form("[]"), file: UploadFile | None = File(None)):
    if file:
        df = await run_in_threadpool(dataset_service.parse_file, await file.read(), file.filename)
        incoming = json.loads(df.to_json(orient="records", date_format="iso", double_precision=15))
    else:
        try:
            incoming = json.loads(rows)
        except (ValueError, TypeError) as exc:
            raise HTTPException(400, "Rows must contain valid JSON.") from exc
    if not isinstance(incoming, list) or any(not isinstance(r, dict) for r in incoming):
        raise HTTPException(400, "Rows must be an array of objects.")
    return await run_in_threadpool(dataset_service.mutate, dataset_id, "append", incoming)

@router.delete("/{dataset_id}/rows")
def delete_rows(dataset_id: str, payload: DeleteRowsPayload):
    return dataset_service.mutate(dataset_id, "delete_rows", payload.rowIds)

@router.post("/{dataset_id}/append/preview")
async def preview_append(dataset_id: str, file: UploadFile = File(...)):
    df = await run_in_threadpool(dataset_service.parse_file, await file.read(), file.filename)
    entry = dataset_service._entry(dataset_service._catalog(), dataset_id)
    snap = dataset_service._snapshot(entry)
    expected = {c["name"] for c in snap["columns"]}
    missing = sorted(expected - set(df.columns))
    extra = sorted(set(df.columns) - expected)
    valid, invalid = [], []
    for i, row in enumerate(json.loads(df.to_json(orient="records", date_format="iso", double_precision=15)), 1):
        errors = []
        for column in snap["columns"]:
            value = row.get(column["name"])
            if column["type"] == "number" and value is not None:
                try:
                    float(value)
                except (ValueError, TypeError):
                    errors.append(f"{column['name']} must be numeric")
        if errors:
            invalid.append({"rowNumber": i, "data": row, "errors": errors})
        else:
            valid.append({**row, "__rowId": f"preview-{i}"})
    return {"totalRows": len(df), "validRows": valid, "invalidRows": invalid,
            "missingColumns": missing, "extraColumns": extra}

@router.get("/{dataset_id}/versions")
def dataset_versions(dataset_id: str):
    entry = dataset_service._entry(dataset_service._catalog(), dataset_id)
    return {"currentVersion": entry["currentVersion"], "versions": entry["versions"]}

@router.post("/{dataset_id}/rollback")
def rollback(dataset_id: str, payload: RollbackPayload):
    return dataset_service.restore(dataset_id, payload.version)

@router.post("/{dataset_id}/activate")
def activate(dataset_id: str):
    return dataset_service.activate(dataset_id)

@router.post("/{dataset_id}/reindex")
def reindex(dataset_id: str):
    return dataset_service.reindex(dataset_id)

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str):
    return dataset_service.delete(dataset_id)
