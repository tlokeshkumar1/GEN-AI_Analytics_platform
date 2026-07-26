from typing import Dict, Any
from api.rag.retriever import retriever
from api.rag.prompt_builder import prompt_builder
from api.rag.generator import generator
from api.services.python_graph_agent import python_graph_agent

class RAGPipeline:
    def _is_graph_request(self, query: str) -> bool:
        q = query.lower()
        keywords = [
            "chart", "graph", "plot", "visualize", "visualization",
            "bar chart", "line chart", "scatter", "box plot", "pie chart",
            "histogram", "trend of", "breakdown of", "plot sales", "plot revenue",
            "show graph", "draw graph", "show chart", "analytics graph"
        ]
        return any(kw in q for kw in keywords)

    def run(self, user_message: str, top_k: int = 5) -> Dict[str, Any]:
        # Check if user requests custom graph analytics
        if self._is_graph_request(user_message):
            graph_res = python_graph_agent.generate_custom_graph(user_message)
            if graph_res.get("status") == "success" and graph_res.get("image_base64"):
                # Also retrieve vector sources for context if available
                sources = retriever.retrieve(user_message, top_k=2)
                
                reply_text = (
                    f"I have analyzed the preprocessed dataset (`SAC_Sales_Preprocessed.xlsx`) "
                    f"and generated custom graph analytics for your request.\n\n"
                    f"**Key Insights:**\n{graph_res.get('insights', '')}"
                )
                return {
                    "reply": reply_text,
                    "sources": sources,
                    "graph_image": graph_res.get("image_base64"),
                    "chart_type": graph_res.get("chart_type"),
                    "insights": graph_res.get("insights"),
                    "intent": "graph"
                }

        # Standard RAG Pipeline
        context_chunks = retriever.retrieve(user_message, top_k)
        formatted_prompt = prompt_builder.build_prompt(user_message, context_chunks)
        response_text = generator.generate(formatted_prompt)
        
        return {
            "reply": response_text,
            "sources": context_chunks,
            "intent": "rag"
        }

rag_pipeline = RAGPipeline()
