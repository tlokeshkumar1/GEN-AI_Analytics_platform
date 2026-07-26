from typing import List, Dict, Any

class RAGPromptBuilder:
    def build_prompt(self, user_message: str, context_chunks: List[Dict[str, Any]]) -> str:
        context_str = "\n".join([f"- {c.get('TEXT_CHUNK', '')}" for c in context_chunks])
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
