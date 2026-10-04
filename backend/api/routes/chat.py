from fastapi import APIRouter, HTTPException, Request, Query
from typing import List, Dict, Any, Optional
from api.models.request_models import ChatRequest
from api.models.response_models import ChatResponse
from api.rag.pipeline import rag_pipeline
from api.services.history_service import history_service
from api.utils.auth import get_user_id_from_request
from api.utils.logger import get_logger

logger = get_logger("routes.chat")

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])


# ── Session Endpoints ─────────────────────────────────────────────────────────


@router.get("/sessions", response_model=List[Dict[str, Any]])
def get_all_sessions(request: Request, user_id: Optional[str] = Query(None)):
    """Fetch chat sessions belonging exclusively to the authenticated user."""
    resolved_user_id = get_user_id_from_request(request, user_id)
    return history_service.get_all_sessions(user_id=resolved_user_id)


@router.get("/sessions/{session_id}", response_model=List[Dict[str, Any]])
def get_session_messages(session_id: str, request: Request, user_id: Optional[str] = Query(None)):
    """Fetch message history for a session after verifying user ownership."""
    resolved_user_id = get_user_id_from_request(request, user_id)
    messages = history_service.get_session_messages(session_id, user_id=resolved_user_id)
    return messages


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, request: Request, user_id: Optional[str] = Query(None)):
    """Delete a chat session and all its messages if owned by the user."""
    resolved_user_id = get_user_id_from_request(request, user_id)
    success = history_service.delete_session(session_id, user_id=resolved_user_id)
    if not success:
        raise HTTPException(status_code=403, detail="Session not found or access denied")
    return {"status": "deleted", "session_id": session_id}


# ── Chat Endpoint (with history persistence) ──────────────────────────────────


@router.post("", response_model=ChatResponse)
def chat_with_rag(req: ChatRequest, request: Request):
    """
    Process a chat message through the RAG pipeline.
    Persists both user query and chatbot response to HANA Cloud linked to the authenticated user.
    """
    user_id = get_user_id_from_request(request, req.user_id)
    session_id = history_service.get_or_create_session(req.session_id, user_id=user_id, first_message=req.message)

    # 1. Save the user query
    history_service.save_message(
        session_id=session_id,
        role="user",
        content=req.message,
    )

    # 2. Load recent history for context-aware RAG
    chat_history = history_service.get_recent_history(session_id, limit=10)

    # 3. Run the RAG pipeline
    result = rag_pipeline.run(req.message, req.top_k, chat_history=chat_history)

    # 4. Save the chatbot response
    history_service.save_message(
        session_id=session_id,
        role="assistant",
        content=result.get("reply", ""),
        sources=result.get("sources", []),
        intent=result.get("intent"),
        metadata={
            "chart_type": result.get("chart_type"),
            "insights": result.get("insights"),
            "graph_image": result.get("graph_image"),
        },
    )

    return ChatResponse(
        reply=result["reply"],
        sources=result.get("sources", []),
        session_id=session_id,
        graph_image=result.get("graph_image"),
        chart_type=result.get("chart_type"),
        insights=result.get("insights"),
        intent=result.get("intent"),
    )

