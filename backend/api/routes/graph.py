from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from api.services.python_graph_agent import python_graph_agent
from api.services.intent_engine import intent_engine

router = APIRouter(prefix="/api/graph", tags=["Custom Graph Generation"])


class GraphRequest(BaseModel):
    prompt: str = Field(..., description="Natural language description of requested visualization")


class GraphResponse(BaseModel):
    status: str
    prompt: str
    image_base64: str
    chart_type: Optional[str] = None
    insights: Optional[str] = None
    message: str
    records_matched: Optional[int] = None
    query_plan: Optional[Dict[str, Any]] = None
    # ── New optional fields (backward-compatible) ─────────────────────────
    records_in_source: Optional[int] = None
    verified: Optional[bool] = None
    data_as_of: Optional[str] = None


@router.post("/generate", response_model=GraphResponse)
def generate_graph(req: GraphRequest):
    """
    Step 3 — Receive user's natural-language graph request.
    Classifies intent via IntentEngine and delegates to PythonGraphAgent for code generation & execution.
    """
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Graph prompt cannot be empty.")

    # Classify intent and structure query plan
    plan = intent_engine.classify(req.prompt)
    
    result = python_graph_agent.generate_custom_graph(req.prompt, query_plan=plan)
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Graph generation failed"))

    result["query_plan"] = plan
    return GraphResponse(**result)

