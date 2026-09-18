from typing import List, Dict, Any
from api.services.vector_service import vector_service

class ContextRetriever:
    def retrieve(self, query: str, top_k: int = 25) -> List[Dict[str, Any]]:
        # Increase retrieval window to ensure overall summary chunks, yearly chunks, and detail chunks are all included
        k = max(top_k, 25)
        results = vector_service.search_similar_chunks(query, k)
        
        # Sort chunks so that overall and yearly summaries appear first for LLM context prioritization
        def chunk_priority(chunk):
            cid = str(chunk.get("ID", "")).lower()
            if "overall" in cid or "enterprise" in cid:
                return 0
            elif "yearly" in cid:
                return 1
            elif "quarterly" in cid:
                return 2
            return 3

        sorted_results = sorted(results, key=chunk_priority)
        return sorted_results

retriever = ContextRetriever()
