from api.services.dataset_service import dataset_service


class UploadService:
    def process_file(self, content: bytes, filename: str):
        result = dataset_service.upload(content, filename)
        return {"filename": result["dataset"]["currentFilename"],
                "rows_processed": result["dataset"]["rowCount"],
                "embeddings_generated": result["embeddings_generated"],
                "embedding_status": result["dataset"]["embeddingStatus"],
                "dataset": result["dataset"], "version": result["version"],
                "status": "success", "message": result["message"]}


upload_service = UploadService()
