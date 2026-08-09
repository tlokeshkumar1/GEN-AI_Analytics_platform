import requests
from typing import List, Dict, Any
import threading
import time
from api.config import settings
from api.utils.logger import get_logger

logger = get_logger("services.ai_core_service")

# In-memory caches to avoid repeated NVIDIA API calls
_embedding_cache = {}
_completion_cache = {}
_cache_lock = threading.Lock()

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

    def _request_with_retry(self, url: str, headers: dict, payload: dict, timeout: int, max_retries: int = 1) -> requests.Response:
        """Make HTTP request with exponential backoff retry."""
        last_exception = None
        for attempt in range(max_retries + 1):
            try:
                res = requests.post(url, json=payload, headers=headers, timeout=timeout)
                res.raise_for_status()
                return res
            except requests.exceptions.Timeout as e:
                last_exception = e
                if attempt < max_retries:
                    wait_time = (2 ** attempt) * 1  # 1s, 2s
                    logger.warning(f"Request timeout (attempt {attempt + 1}/{max_retries + 1}), retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Request failed after {max_retries + 1} attempts: {e}")
                    raise
            except Exception as e:
                last_exception = e
                logger.error(f"Request failed: {e}")
                raise
        raise last_exception

    def generate_completion(self, prompt: str) -> str:
        """Generate a text completion using NVIDIA LLM API (meta/llama-3.3-70b-instruct)."""
        api_key = settings.NVIDIA_API_KEY
        if not api_key:
            logger.warning("NVIDIA API key not configured, returning simulated response")
            return f"AI Insight (Simulated response for: '{prompt[:50]}...')"

        # Check completion cache
        cache_key = hash(prompt)
        with _cache_lock:
            if cache_key in _completion_cache:
                logger.debug("Completion cache hit")
                return _completion_cache[cache_key]

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.NVIDIA_LLM_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 2048,  # Reduced from 4096 for faster response
        }
        try:
            # Use very short timeout with no retries for faster fallback
            res = requests.post(
                settings.NVIDIA_LLM_URL,
                json=payload,
                headers=headers,
                timeout=5  # Very short timeout - 5 seconds max
            )
            res.raise_for_status()
            data = res.json()
            result = data["choices"][0]["message"]["content"]
            
            # Cache the result
            with _cache_lock:
                _completion_cache[cache_key] = result
            
            return result
        except requests.exceptions.Timeout:
            logger.warning("NVIDIA LLM request timed out (5s), using fast fallback")
            return f"AI Insight (Fast fallback for: '{prompt[:50]}...')"
        except Exception as e:
            logger.error(f"NVIDIA LLM completion request failed: {e}")
            return f"AI Insight (Simulated response for: '{prompt[:50]}...')"

    def generate_embedding(self, text: str) -> List[float]:
        api_key = settings.NVIDIA_API_KEY
        if not api_key:
            logger.warning("NVIDIA API key not configured, returning mock 1536-dim embedding")
            return [0.01 * (i % 10) for i in range(1536)]

        # Check cache first
        cache_key = hash(text)
        with _cache_lock:
            if cache_key in _embedding_cache:
                logger.debug("Embedding cache hit")
                return _embedding_cache[cache_key]

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.NVIDIA_EMBEDDING_MODEL,
            "input": [text],
            "input_type": "passage"
        }
        try:
            res = self._request_with_retry(
                settings.NVIDIA_API_URL,
                headers,
                payload,
                timeout=10,  # Reduced from 15s to 10s
                max_retries=2
            )
            embedding_2048 = res.json()["data"][0]["embedding"]
            # Slice to 1536 to match the HANA database column size (REAL_VECTOR(1536))
            embedding = embedding_2048[:1536]
            
            # Cache the result
            with _cache_lock:
                _embedding_cache[cache_key] = embedding
            
            return embedding
        except Exception as e:
            logger.error(f"NVIDIA Embedding request failed: {e}")
            return [0.01 * (i % 10) for i in range(1536)]


ai_core_service = AICoreService()
