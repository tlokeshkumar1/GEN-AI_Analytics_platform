import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from root or local directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

class Settings(BaseSettings):
    # SAP AI Core Configuration
    AICORE_AUTH_URL: str = os.getenv("AICORE_AUTH_URL", "")
    AICORE_CLIENT_ID: str = os.getenv("AICORE_CLIENT_ID", "")
    AICORE_CLIENT_SECRET: str = os.getenv("AICORE_CLIENT_SECRET", "")
    AICORE_RESOURCE_GROUP: str = os.getenv("AICORE_RESOURCE_GROUP", "default")
    AICORE_BASE_URL: str = os.getenv("AICORE_BASE_URL", "")

    # SAP HANA Cloud Configuration
    HANA_ADDRESS: str = os.getenv("HANA_ADDRESS", "localhost")
    HANA_PORT: int = int(os.getenv("HANA_PORT", "443"))
    HANA_USER: str = os.getenv("HANA_USER", "DBADMIN")
    HANA_PASSWORD: str = os.getenv("HANA_PASSWORD", "")
    HANA_SCHEMA: str = os.getenv("HANA_SCHEMA", "SALES_ANALYTICS")

    # Application Settings
    APP_ENV: str = os.getenv("APP_ENV", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    PORT: int = int(os.getenv("PORT", "8000"))

    class Config:
        case_sensitive = True

settings = Settings()
