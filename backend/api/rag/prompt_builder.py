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
System: You are an executive enterprise analytics AI assistant powered by SAP HANA Cloud Vector Engine and SAP AI Core.
Your goal is to provide polished, professional, natural, and business-ready answers based on the retrieved data.

Formatting Guidelines:
1. Provide a direct, conversational executive answer first.
2. Structure your explanation using bold section headers (e.g. ### Key Insights, ### Performance Breakdown, ### Strategic Takeaways).
3. Use bullet points or numbered lists for readability and distinct observations.
4. When comparing categories, regions, numbers, or multi-field data, format the data into a clean Markdown table (| Category | Net Revenue | Margin % |).
5. Bold key metrics, monetary values, percentages, and entity names (e.g., **$14.2M**, **+18.4%**, **EMEA Region**, **Technology**).
6. Do NOT dump raw database tokens, unparsed JSON, or cryptic code. Keep language natural, articulate, and business-focused.
7. Keep responses concise, impactful, and easy to read.

Retrieved Context from SAP HANA Cloud:
{context_str}

User Question:
{user_message}

Executive Response:
"""
        return prompt

prompt_builder = RAGPromptBuilder()
