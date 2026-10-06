from typing import List
from api.services.ai_core_service import ai_core_service

class EmbeddingService:
    def get_embedding(self, text: str) -> List[float]:
        return ai_core_service.generate_embedding(text)

    def batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        from concurrent.futures import ThreadPoolExecutor
        batches = [texts[i:i + 16] for i in range(0, len(texts), 16)]
        with ThreadPoolExecutor(max_workers=4) as pool:
            return [embedding for batch in pool.map(ai_core_service.generate_embeddings, batches) for embedding in batch]

embedding_service = EmbeddingService()
