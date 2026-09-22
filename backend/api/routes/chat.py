from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from api.models.request_models import ChatRequest
from api.models.response_models import ChatResponse
from api.rag.pipeline import rag_pipeline
from api.services.history_service import history_service
from api.utils.logger import get_logger

logger = get_logger("routes.chat")

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])


# ── Session Endpoints ─────────────────────────────────────────────────────────


@router.get("/sessions", response_model=List[Dict[str, Any]])
def get_all_sessions():
    """Fetch all shared chat sessions ordered by most recently updated."""
    return history_service.get_all_sessions()


@router.get("/sessions/{session_id}", response_model=List[Dict[str, Any]])
def get_session_messages(session_id: str):
    """Fetch full message history (user queries & bot responses) for a session."""
    messages = history_service.get_session_messages(session_id)
    return messages


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    """Delete a chat session and all its messages."""
    success = history_service.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete session")
    return {"status": "deleted", "session_id": session_id}


# ── Chat Endpoint (with history persistence) ──────────────────────────────────


@router.post("", response_model=ChatResponse)
def chat_with_rag(req: ChatRequest):
    """
    Process a chat message through the RAG pipeline.
    Persists both the user query and the chatbot response to HANA Cloud.
    If no session_id is provided, creates a new session automatically.
    """
    session_id = req.session_id

    # Auto-create a new session if none provided or "default"
    if not session_id or session_id == "default":
        subject = history_service._generate_subject(req.message)
        session_id = history_service.create_session(subject=subject)
    else:
        # Verify session exists; if not, create it
        existing = history_service.get_session_messages(session_id)
        if not existing:
            subject = history_service._generate_subject(req.message)
            # Create session with the given ID is tricky, so just use it
            try:
                from api.database.connection import db_manager
                from datetime import datetime
                conn = db_manager.get_connection()
                if conn:
                    cursor = conn.cursor()
                    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                    cursor.execute(
                        "INSERT INTO CHAT_SESSIONS (SESSION_ID, SUBJECT, CREATED_AT, UPDATED_AT) VALUES (?, ?, ?, ?)",
                        (session_id, subject[:255], now, now),
                    )
                    conn.commit()
                    cursor.close()
                    db_manager.return_connection(conn)
            except Exception:
                pass

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
