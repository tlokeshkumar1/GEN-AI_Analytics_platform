from typing import Dict, Any
import re
from api.rag.retriever import retriever
from api.rag.prompt_builder import prompt_builder
from api.rag.generator import generator
from api.services.python_graph_agent import python_graph_agent
from api.services.data_service import data_service

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

    def _is_order_id_query(self, query: str) -> str:
        """Check if query is asking for a specific OrderID and return it."""
        # Pattern to match OrderID like SO-106760
        pattern = r'\b(SO-\d+)\b'
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        return None

    def _get_exact_order_data(self, order_id: str) -> Dict[str, Any]:
        """Get exact order data from DataService."""
        order_data = data_service.get_order_details(order_id)
        if order_data:
            # Format the order data as a readable response
            formatted = f"Order Details for {order_id}:\n\n"
            for key, value in order_data.items():
                formatted += f"**{key}**: {value}\n"
            return {
                "reply": formatted,
                "sources": [{
                    "ID": order_id,
                    "TEXT_CHUNK": formatted,
                    "SCORE": 1.0,
                    "METADATA": f'{{"source": "SAC_Sales_Preprocessed", "sheet": "Sheet1", "row_id": "{order_id}"}}'
                }],
                "intent": "exact_order"
            }
        return None

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

        # Check if user is asking for a specific OrderID
        order_id = self._is_order_id_query(user_message)
        if order_id:
            exact_data = self._get_exact_order_data(order_id)
            if exact_data:
                return exact_data

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
