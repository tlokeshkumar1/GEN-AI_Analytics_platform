from typing import List, Dict, Any, Optional
import json
from api.database.hana_client import hana_client
from api.utils.logger import get_logger

logger = get_logger("database.vector_client")

class HANAVectorClient:
    def __init__(self):
        self._schema_checked = False

    def _ensure_schema(self):
        if self._schema_checked:
            return
        try:
            # Try to add METADATA column if it doesn't exist
            hana_client.execute_query("ALTER TABLE VECTOR_TABLE ADD (METADATA NCLOB)")
            logger.info("Checked and updated VECTOR_TABLE to support METADATA")
        except Exception as e:
            # If the column already exists or table doesn't exist yet, ignore
            pass
        self._schema_checked = True

    def similarity_search(self, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        self._ensure_schema()
        # Uses SAP HANA Vector Engine L2_DISTANCE or COSINE_SIMILARITY
        vector_str = f"'{query_embedding}'"
        sql = f"""
            SELECT TOP {top_k} ID, TEXT_CHUNK, METADATA, COSINE_SIMILARITY(EMBEDDING, TO_REAL_VECTOR({vector_str})) AS SCORE
            FROM VECTOR_TABLE
            ORDER BY SCORE DESC
        """
        try:
            return hana_client.execute_query(sql)
        except Exception as e:
            logger.warning(f"Vector search fallback to mock/empty due to DB state: {e}")
            return []

    def store_vector(self, doc_id: str, text_chunk: str, embedding: List[float], metadata: Optional[Any] = None):
        self._ensure_schema()
        vector_str = f"'{embedding}'"
        metadata_str = None
        if metadata is not None:
            if isinstance(metadata, str):
                metadata_str = metadata
            else:
                try:
                    metadata_str = json.dumps(metadata)
                except Exception:
                    metadata_str = str(metadata)

        sql = """
            INSERT INTO VECTOR_TABLE (ID, TEXT_CHUNK, EMBEDDING, METADATA)
            VALUES (?, ?, TO_REAL_VECTOR(?), ?)
        """
        try:
            hana_client.execute_query(sql, (doc_id, text_chunk, vector_str, metadata_str))
        except Exception as e:
            logger.warning(f"Vector store fallback: {e}")

vector_client = HANAVectorClient()
