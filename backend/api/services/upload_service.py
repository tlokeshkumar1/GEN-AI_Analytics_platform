import io
import pandas as pd
from typing import Dict, Any
from api.utils.logger import get_logger

logger = get_logger("services.upload_service")

class UploadService:
    def process_file(self, content: bytes, filename: str) -> Dict[str, Any]:
        logger.info(f"Processing uploaded dataset file: {filename}")
        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(content))
            else:
                df = pd.read_excel(io.BytesIO(content))
            
            rows_processed = len(df)
            return {
                "filename": filename,
                "rows_processed": rows_processed,
                "status": "success",
                "message": f"Successfully processed {rows_processed} rows from {filename}."
            }
        except Exception as e:
            logger.error(f"Error processing upload file {filename}: {e}")
            return {
                "filename": filename,
                "rows_processed": 0,
                "status": "error",
                "message": f"Failed to parse file: {str(e)}"
            }

upload_service = UploadService()
