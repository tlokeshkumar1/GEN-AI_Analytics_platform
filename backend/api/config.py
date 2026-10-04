import os
import json
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

def _get_hana_credentials_from_vcap():
    """Extract HANA credentials from VCAP_SERVICES (CF environment)."""
    vcap_services = os.getenv("VCAP_SERVICES")
    if not vcap_services:
        return {}
    try:
        services = json.loads(vcap_services)
        # HDI container credentials are under 'hana' key
        hana_services = services.get("hana", [])
        for svc in hana_services:
            creds = svc.get("credentials", {})
            if creds.get("host") and creds.get("user") and creds.get("password"):
                return {
                    "host": creds.get("host", ""),
                    "port": int(creds.get("port", 443)),
                    "user": creds.get("user", ""),
                    "password": creds.get("password", ""),
                    "schema": creds.get("schema", ""),
                }
    except Exception:
        pass
    return {}

def _get_aicore_credentials_from_vcap():
    """Extract AI Core credentials from VCAP_SERVICES (CF environment)."""
    vcap_services = os.getenv("VCAP_SERVICES")
    if not vcap_services:
        return {}
    try:
        services = json.loads(vcap_services)
        aicore_services = services.get("aicore", [])
        for svc in aicore_services:
            creds = svc.get("credentials", {})
            if creds.get("clientid"):
                auth_url = creds.get("url", "")
                if auth_url and not auth_url.endswith("/oauth/token"):
                    auth_url = auth_url.rstrip("/") + "/oauth/token"
                service_urls = creds.get("serviceurls", {})
                base_url = service_urls.get("AI_API_URL", "")
                return {
                    "client_id": creds.get("clientid", ""),
                    "client_secret": creds.get("clientsecret", ""),
                    "auth_url": auth_url,
                    "base_url": base_url
                }
    except Exception:
        pass
    return {}

def _get_xsuaa_credentials_from_vcap():
    """Extract XSUAA credentials from VCAP_SERVICES or environment."""
    vcap_services = os.getenv("VCAP_SERVICES")
    if not vcap_services:
        # Check default-env.json if present
        default_env_path = BASE_DIR / "default-env.json"
        if default_env_path.exists():
            try:
                with open(default_env_path, "r", encoding="utf-8") as f:
                    content = json.load(f)
                    vcap_services = json.dumps(content.get("VCAP_SERVICES", {}))
            except Exception:
                pass
    if not vcap_services:
        return {}
    try:
        services = json.loads(vcap_services) if isinstance(vcap_services, str) else vcap_services
        xsuaa_services = services.get("xsuaa", [])
        for svc in xsuaa_services:
            # The apiaccess binding is for SCIM, not application sign-in.
            if svc.get("plan") == "apiaccess":
                continue
            creds = svc.get("credentials", {})
            if creds.get("clientid"):
                auth_url = creds.get("url", "")
                if auth_url and not auth_url.endswith("/oauth/token"):
                    auth_url = auth_url.rstrip("/") + "/oauth/token"
                return {
                    "client_id": creds.get("clientid", ""),
                    "client_secret": creds.get("clientsecret", ""),
                    "auth_url": auth_url,
                    "url": creds.get("url", ""),
                    "xsappname": creds.get("xsappname", ""),
                    "verification_key": creds.get("verificationkey", ""),
                    "identity_zone": creds.get("identityzone", "")
                }
    except Exception:
        pass
    return {}

_vcap_hana = _get_hana_credentials_from_vcap()
_vcap_aicore = _get_aicore_credentials_from_vcap()
_vcap_xsuaa = _get_xsuaa_credentials_from_vcap()

class Settings(BaseSettings):
    # SAP XSUAA Security Configuration
    XSUAA_URL: str = _vcap_xsuaa.get("url") or os.getenv("XSUAA_URL", "")
    XSUAA_AUTH_URL: str = _vcap_xsuaa.get("auth_url") or os.getenv("XSUAA_AUTH_URL", "")
    XSUAA_CLIENT_ID: str = _vcap_xsuaa.get("client_id") or os.getenv("XSUAA_CLIENT_ID", "")
    XSUAA_CLIENT_SECRET: str = _vcap_xsuaa.get("client_secret") or os.getenv("XSUAA_CLIENT_SECRET", "")
    XSUAA_XSAPPNAME: str = _vcap_xsuaa.get("xsappname") or os.getenv("XSUAA_XSAPPNAME", "")
    XSUAA_VERIFICATION_KEY: str = _vcap_xsuaa.get("verification_key") or os.getenv("XSUAA_VERIFICATION_KEY", "")

    # SAP AI Core Configuration
    AICORE_AUTH_URL: str = _vcap_aicore.get("auth_url") or os.getenv("AICORE_AUTH_URL", "")
    AICORE_CLIENT_ID: str = _vcap_aicore.get("client_id") or os.getenv("AICORE_CLIENT_ID", "")
    AICORE_CLIENT_SECRET: str = _vcap_aicore.get("client_secret") or os.getenv("AICORE_CLIENT_SECRET", "")
    AICORE_RESOURCE_GROUP: str = os.getenv("AICORE_RESOURCE_GROUP", "default")
    AICORE_BASE_URL: str = _vcap_aicore.get("base_url") or os.getenv("AICORE_BASE_URL", "")
    AICORE_DEPLOYMENT_ID: str = os.getenv("AICORE_DEPLOYMENT_ID", "")
    AICORE_DEPLOYMENT_URL: str = os.getenv("AICORE_DEPLOYMENT_URL", "")

    # NVIDIA API Configuration
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    NVIDIA_EMBEDDING_MODEL: str = os.getenv("NVIDIA_EMBEDDING_MODEL", "nvidia/nemotron-3-embed-1b")
    NVIDIA_API_URL: str = os.getenv("NVIDIA_API_URL", "https://integrate.api.nvidia.com/v1/embeddings")
    NVIDIA_LLM_MODEL: str = os.getenv("NVIDIA_LLM_MODEL", "meta/llama-3.2-11b-vision-instruct")
    NVIDIA_LLM_URL: str = os.getenv("NVIDIA_LLM_URL", "https://integrate.api.nvidia.com/v1/chat/completions")


    # SAP HANA Cloud Configuration (env vars take precedence to ensure Localhost & CF share identical database user and sessions)
    HANA_ADDRESS: str = os.getenv("HANA_ADDRESS") or _vcap_hana.get("host", "")
    HANA_PORT: int = int(os.getenv("HANA_PORT") or _vcap_hana.get("port") or 443)
    HANA_USER: str = os.getenv("HANA_USER") or _vcap_hana.get("user", "")
    HANA_PASSWORD: str = os.getenv("HANA_PASSWORD") or _vcap_hana.get("password", "")
    HANA_SCHEMA: str = os.getenv("HANA_SCHEMA") or _vcap_hana.get("schema", "")

    # Application Settings
    APP_ENV: str = os.getenv("APP_ENV", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Data Freshness Settings
    DATA_REFRESH_INTERVAL_MINUTES: int = int(os.getenv("DATA_REFRESH_INTERVAL_MINUTES", "15"))
    DATA_STALE_MAX_HOURS: float = float(os.getenv("DATA_STALE_MAX_HOURS", "24"))

    class Config:
        case_sensitive = True

settings = Settings()
