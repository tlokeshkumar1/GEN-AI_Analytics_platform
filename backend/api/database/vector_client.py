from typing import List, Dict, Any
from api.database.hana_client import hana_client
from api.utils.logger import get_logger

logger = get_logger("database.vector_client")

class HANAVectorClient:
    def similarity_search(self, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        # Uses SAP HANA Vector Engine L2_DISTANCE or COSINE_SIMILARITY
        vector_str = f"'{query_embedding}'"
        sql = f"""
            SELECT TOP {top_k} ID, TEXT_CHUNK, COSINE_SIMILARITY(EMBEDDING, TO_REAL_VECTOR({vector_str})) AS SCORE
            FROM VECTOR_TABLE
            ORDER BY SCORE DESC
        """
        try:
            return hana_client.execute_query(sql)
        except Exception as e:
            logger.warning(f"Vector search fallback to mock/empty due to DB state: {e}")
            return []

    def store_vector(self, doc_id: str, text_chunk: str, embedding: List[float]):
        vector_str = f"'{embedding}'"
        sql = """
            INSERT INTO VECTOR_TABLE (ID, TEXT_CHUNK, EMBEDDING)
            VALUES (?, ?, TO_REAL_VECTOR(?))
        """
        try:
            hana_client.execute_query(sql, (doc_id, text_chunk, vector_str))
        except Exception as e:
            logger.warning(f"Vector store fallback: {e}")

vector_client = HANAVectorClient()
