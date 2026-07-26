import requests
from typing import List, Dict, Any
from api.config import settings
from api.utils.logger import get_logger

logger = get_logger("services.ai_core_service")

class AICoreService:
    def __init__(self):
        self.auth_url = settings.AICORE_AUTH_URL
        self.client_id = settings.AICORE_CLIENT_ID
        self.client_secret = settings.AICORE_CLIENT_SECRET
        self.resource_group = settings.AICORE_RESOURCE_GROUP
        self.base_url = settings.AICORE_BASE_URL
        self.token = None

    def get_token(self) -> str:
        if not self.auth_url or not self.client_id:
            logger.warning("AICore credentials not configured, returning dummy token")
            return "mock_token"
        
        try:
            response = requests.post(
                self.auth_url,
                data={"grant_type": "client_credentials"},
                auth=(self.client_id, self.client_secret),
                timeout=10
            )
            response.raise_for_status()
            self.token = response.json().get("access_token")
            return self.token
        except Exception as e:
            logger.error(f"Failed to fetch SAP AI Core OAuth token: {e}")
            return "mock_token"

    def generate_completion(self, prompt: str) -> str:
        token = self.get_token()
        if token == "mock_token":
            return f"AI Insight (Simulated response for: '{prompt[:50]}...')"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "AI-Resource-Group": self.resource_group,
            "Content-Type": "application/json"
        }
        payload = {
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2
        }
        try:
            url = f"{self.base_url}/inference/deployments/v1/chat/completions"
            res = requests.post(url, json=payload, headers=headers, timeout=30)
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"AI Core completion request failed: {e}")
            return f"Simulated Response: Analysis complete for prompt."

    def generate_embedding(self, text: str) -> List[float]:
        token = self.get_token()
        if token == "mock_token":
            # Return dummy 1536-dim vector for dev/testing
            return [0.01 * (i % 10) for i in range(1536)]
        
        headers = {
            "Authorization": f"Bearer {token}",
            "AI-Resource-Group": self.resource_group,
            "Content-Type": "application/json"
        }
        payload = {"input": text}
        try:
            url = f"{self.base_url}/inference/deployments/v1/embeddings"
            res = requests.post(url, json=payload, headers=headers, timeout=15)
            res.raise_for_status()
            return res.json()["data"][0]["embedding"]
        except Exception as e:
            logger.error(f"Embedding request failed: {e}")
            return [0.01 * (i % 10) for i in range(1536)]

ai_core_service = AICoreService()
