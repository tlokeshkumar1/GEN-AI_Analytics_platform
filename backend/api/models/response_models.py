from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    hana_connected: bool
    ai_core_connected: bool

class KPICardData(BaseModel):
    title: str
    value: str
    change: str
    trend: str # "up" | "down" | "neutral"

class DashboardSummaryResponse(BaseModel):
    kpis: List[KPICardData]
    revenue_trend: List[Dict[str, Any]]
    region_breakdown: List[Dict[str, Any]]
    country_breakdown: List[Dict[str, Any]]
    category_breakdown: List[Dict[str, Any]]
    quarterly_performance: List[Dict[str, Any]]
    top_products: List[Dict[str, Any]]

class ChatResponse(BaseModel):
    reply: str
    sources: List[Dict[str, Any]] = []
    session_id: str
    graph_image: Optional[str] = None
    chart_type: Optional[str] = None
    insights: Optional[str] = None
    intent: Optional[str] = None

class AnalyticsResponse(BaseModel):
    query: str
    generated_sql: str
    results: List[Dict[str, Any]]
    summary_insights: str
    recommended_chart: str

class UploadResponse(BaseModel):
    filename: str
    rows_processed: int
    embeddings_generated: Optional[int] = 0
    status: str
    message: str


# ── Enhanced Response Models (v2) ─────────────────────────────────────────────

class ProcessingStep(BaseModel):
    """Represents a single backend processing stage for real-time UI feedback."""
    stage: str       # "intent", "schema", "filter", "retrieval", "calculation", "validation", "generation"
    status: str      # "running", "completed", "error", "skipped"
    message: str
    details: Optional[Dict[str, Any]] = None

class EnhancedChatResponse(BaseModel):
    """
    Structured response for the upgraded hybrid RAG + analytics pipeline.
    Backward-compatible with ChatResponse fields.
    """
    type: str = "chat"           # "chat", "graph", "analytical", "error"
    status: str = "success"      # "success", "error", "partial"
    reply: str = ""
    data: Optional[Dict[str, Any]] = None
    processing: List[ProcessingStep] = []
    sources: List[Dict[str, Any]] = []
    graph_image: Optional[str] = None
    chart_type: Optional[str] = None
    insights: Optional[str] = None
    intent: Optional[str] = None
    query_plan: Optional[Dict[str, Any]] = None
    records_matched: Optional[int] = None
    session_id: str = "default"

