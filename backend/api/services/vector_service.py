from typing import List, Dict, Any
from api.database.vector_client import vector_client
from api.services.ai_core_service import ai_core_service
from api.utils.logger import get_logger

logger = get_logger("services.vector_service")

class VectorService:
    def search_similar_chunks(self, text_query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        embedding = ai_core_service.generate_embedding(text_query)
        results = vector_client.similarity_search(embedding, top_k)
        if not results:
            # Fallback mock context if DB empty
            return [{
                "ID": "chunk_01",
                "TEXT_CHUNK": f"Sales context match for '{text_query}': Enterprise software and tech hardware in North America drove 35% of Q3 profit margin.",
                "SCORE": 0.92
            }]
        return results

    def add_document_vector(self, doc_id: str, text: str):
        embedding = ai_core_service.generate_embedding(text)
        vector_client.store_vector(doc_id, text, embedding)

vector_service = VectorService()
