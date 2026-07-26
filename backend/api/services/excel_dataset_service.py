import os
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd
from api.utils.logger import get_logger

logger = get_logger("services.excel_dataset_service")

class ExcelDatasetService:
    def __init__(self):
        self._df: Optional[pd.DataFrame] = None
        # Base path pointing to preprocessing/output/SAC_Sales_Preprocessed.xlsx
        self._default_path = Path(__file__).resolve().parent.parent.parent / "preprocessing" / "output" / "SAC_Sales_Preprocessed.xlsx"

    def get_df(self) -> pd.DataFrame:
        if self._df is None:
            if not self._default_path.exists():
                # Fallback check for absolute path if needed
                alt_path = Path(r"D:\Projects\New folder (3)\GEN-AI_Analytics_platform\backend\preprocessing\output\SAC_Sales_Preprocessed.xlsx")
                if alt_path.exists():
                    self._default_path = alt_path
                else:
                    logger.error(f"Excel dataset not found at {self._default_path}")
                    raise FileNotFoundError(f"Dataset file not found at {self._default_path}")
            
            logger.info(f"Loading preprocessed Excel dataset from: {self._default_path}")
            self._df = pd.read_excel(self._default_path)
            logger.info(f"Dataset loaded successfully with shape {self._df.shape}")
        return self._df

    def get_fast_dataset_path(self) -> Path:
        pkl_path = self._default_path.with_suffix(".pkl")
        if not pkl_path.exists():
            df = self.get_df()
            logger.info(f"Creating fast binary dataset cache: {pkl_path}")
            df.to_pickle(pkl_path)
        return pkl_path

    def parse_dataset(self, file_path: str) -> Dict[str, Any]:
        df = self.get_df()
        return {
            "status": "success",
            "file_path": str(self._default_path),
            "rows": len(df),
            "columns": df.columns.tolist()
        }

excel_dataset_service = ExcelDatasetService()
