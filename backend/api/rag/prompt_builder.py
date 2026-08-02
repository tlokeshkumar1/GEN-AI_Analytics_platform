from typing import List, Dict, Any
import json

class RAGPromptBuilder:
    def build_prompt(self, user_message: str, context_chunks: List[Dict[str, Any]]) -> str:
        formatted_chunks = []
        for c in context_chunks:
            text = c.get('TEXT_CHUNK', '')
            metadata_raw = c.get('METADATA')
            meta_str = ""
            if metadata_raw:
                try:
                    if isinstance(metadata_raw, str):
                        meta = json.loads(metadata_raw)
                    else:
                        meta = metadata_raw
                    source = meta.get('source', '')
                    sheet = meta.get('sheet', '')
                    if source or sheet:
                        meta_str = f" [Source: {source or 'N/A'}, Sheet: {sheet or 'N/A'}]"
                except Exception:
                    pass
            formatted_chunks.append(f"-{meta_str} {text}")

        context_str = "\n".join(formatted_chunks)
        prompt = f"""
System: You are an enterprise analytics assistant using SAP HANA Vector Engine and SAP AI Core.

Retrieved Context:
{context_str}

User Question:
{user_message}

Provide a factual, clear, and professional response:
"""
        return prompt

prompt_builder = RAGPromptBuilder()
