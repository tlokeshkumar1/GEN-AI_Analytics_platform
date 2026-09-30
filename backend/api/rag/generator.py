import json
import requests
from typing import Generator, Optional, List
from api.config import settings
from api.utils.logger import get_logger

logger = get_logger("rag.generator")


class RAGGenerator:
    """
    NVIDIA NIM LLM provider for RAG Chat.
    Supports both synchronous (generate) and streaming (generate_stream) generation.

    - generate()        → used by /api/chat (REST fallback) and analytical pipeline
    - generate_stream() → used by /api/chat/stream (SSE token streaming)
    """

    def __init__(self):
        self.api_url = settings.NVIDIA_LLM_URL
        self.api_key = settings.NVIDIA_API_KEY
        self.model = settings.NVIDIA_LLM_MODEL or "meta/llama-3.2-11b-vision-instruct"

        # Candidate fallback models (same priority as ai_core_service)
        self._fallback_models = [
            self.model,
            "meta/llama-3.2-11b-vision-instruct",
            "nvidia/nemotron-3-super-120b-a12b",
            "minimaxai/minimax-m3",
        ]
        # Deduplicate while preserving order
        seen = set()
        self._candidate_models: List[str] = []
        for m in self._fallback_models:
            if m and m not in seen:
                self._candidate_models.append(m)
                seen.add(m)

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    # ── Synchronous Generation ────────────────────────────────────────────────

    def generate(self, formatted_prompt: str,
                 system_prompt: str = "You are an expert enterprise sales analytics assistant.") -> str:
        """
        Synchronous completion via NVIDIA NIM.
        Used by: /api/chat, _handle_analytical, _generate_analytical_response, etc.
        Tries candidate models in priority order for resilience.
        """
        if not self.api_key:
            logger.error("[RAGGenerator] NVIDIA_API_KEY not configured")
            raise RuntimeError("NVIDIA API key is not configured in environment settings.")

        headers = self._get_headers()

        for idx, model_name in enumerate(self._candidate_models):
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": formatted_prompt},
                ],
                "temperature": 0.2,
                "max_tokens": 1500,
                "stream": False,
            }
            try:
                res = requests.post(self.api_url, headers=headers, json=payload, timeout=60)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    if content and content.strip():
                        if idx == 0:
                            logger.info(f"[RAGGenerator] Model {model_name} completed successfully.")
                        else:
                            logger.info(f"[RAGGenerator] Fallback model {model_name} completed successfully.")
                        return content
                else:
                    logger.warning(f"[RAGGenerator] Model {model_name} returned status {res.status_code}: {res.text[:150]}")
            except requests.exceptions.Timeout:
                logger.warning(f"[RAGGenerator] Model {model_name} timed out, trying next fallback...")
            except Exception as e:
                logger.warning(f"[RAGGenerator] Model {model_name} failed ({e}), trying next fallback...")

        logger.error("[RAGGenerator] All NVIDIA NIM models failed or timed out.")
        raise RuntimeError("All NVIDIA NIM models failed or timed out.")

    # ── Streaming Generation ──────────────────────────────────────────────────

    def generate_stream(self, formatted_prompt: str,
                        system_prompt: str = "You are an expert enterprise sales analytics assistant."
                        ) -> Generator[str, None, None]:
        """
        Token-by-token streaming generator via NVIDIA NIM (stream=True).
        Yields text chunks as they arrive from the model.
        Used by: /api/chat/stream → SSE → React progressive rendering.

        Falls back to synchronous generation if streaming is not supported
        by the specific NIM endpoint.
        """
        if not self.api_key:
            logger.error("[RAGGenerator] NVIDIA_API_KEY not configured")
            raise RuntimeError("NVIDIA API key is not configured in environment settings.")

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": formatted_prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 1500,
            "stream": True,
        }

        headers = self._get_headers()
        headers["Accept"] = "text/event-stream"

        streamed_any = False
        try:
            with requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                stream=True,
                timeout=90,
            ) as resp:
                if resp.status_code != 200:
                    logger.warning(
                        f"[RAGGenerator] Streaming request returned {resp.status_code}, "
                        f"falling back to synchronous generation."
                    )
                    # Fallback: yield the complete response as a single chunk
                    full = self.generate(formatted_prompt, system_prompt)
                    yield full
                    return

                for line in resp.iter_lines():
                    if not line:
                        continue
                    line_str = line.decode("utf-8").strip()

                    if not line_str.startswith("data: "):
                        continue

                    data_str = line_str[6:]
                    if data_str == "[DONE]":
                        break

                    try:
                        chunk = json.loads(data_str)
                        choices = chunk.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                streamed_any = True
                                yield content
                    except (json.JSONDecodeError, KeyError, IndexError) as e:
                        logger.debug(f"[RAGGenerator] Skipping malformed stream chunk: {e}")

        except requests.exceptions.Timeout:
            logger.warning("[RAGGenerator] Streaming request timed out.")
            if not streamed_any:
                logger.info("[RAGGenerator] Falling back to synchronous generation after stream timeout.")
                full = self.generate(formatted_prompt, system_prompt)
                yield full
        except Exception as e:
            logger.error(f"[RAGGenerator] Streaming generation error: {e}")
            if not streamed_any:
                logger.info("[RAGGenerator] Falling back to synchronous generation after stream error.")
                try:
                    full = self.generate(formatted_prompt, system_prompt)
                    yield full
                except Exception as fallback_err:
                    logger.error(f"[RAGGenerator] Synchronous fallback also failed: {fallback_err}")
                    raise


generator = RAGGenerator()
