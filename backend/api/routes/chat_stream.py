import json
import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from api.models.request_models import ChatRequest
from api.rag.pipeline import rag_pipeline
from api.services.history_service import history_service
from api.utils.logger import get_logger

logger = get_logger("routes.chat_stream")

router = APIRouter(prefix="/api/chat", tags=["Chatbot Stream"])

# SSE heartbeat interval (seconds) — keeps connection alive through proxies
HEARTBEAT_INTERVAL = 15.0


@router.post("/stream")
async def chat_stream(req: ChatRequest, request: Request):
    """
    Server-Sent Events (SSE) endpoint for real-time processing feedback & chat responses.

    Event lifecycle:
        request_started  → Pipeline begins
        stage            → Intent detection, vector retrieval, calculation, etc.
        token            → Individual LLM token (progressive rendering)
        final_answer     → Complete assembled response text
        result           → Full structured payload (sources, metadata, session_id)
        request_completed → Pipeline finished

    Each pipeline stage emits events as they happen via a thread-safe asyncio.Queue,
    so the frontend receives updates in real time rather than after the pipeline completes.
    Persists both user query and bot response to HANA Cloud.
    """
    # Queue bridges the sync pipeline thread → async SSE generator
    event_queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    # ── Resolve or create session ─────────────────────────────────────────
    session_id = req.session_id
    if not session_id or session_id == "default":
        subject = history_service._generate_subject(req.message)
        session_id = history_service.create_session(subject=subject)
    else:
        # Ensure session exists
        existing = history_service.get_session_messages(session_id)
        if not existing:
            try:
                from api.database.connection import db_manager
                from datetime import datetime
                conn = db_manager.get_connection()
                if conn:
                    cursor = conn.cursor()
                    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                    cursor.execute(
                        "INSERT INTO CHAT_SESSIONS (SESSION_ID, SUBJECT, CREATED_AT, UPDATED_AT) VALUES (?, ?, ?, ?)",
                        (session_id, history_service._generate_subject(req.message)[:255], now, now),
                    )
                    conn.commit()
                    cursor.close()
                    db_manager.return_connection(conn)
            except Exception:
                pass

    # Save user query immediately
    history_service.save_message(
        session_id=session_id,
        role="user",
        content=req.message,
    )

    # Load recent history for context-aware RAG
    chat_history = history_service.get_recent_history(session_id, limit=10)

    def stage_callback(event: dict) -> None:
        """Thread-safe callback invoked by the pipeline for each stage transition or token."""
        loop.call_soon_threadsafe(event_queue.put_nowait, event)

    async def event_generator():
        pipeline_task = None
        try:
            # Signal that processing has started
            yield f"data: {json.dumps({'type': 'request_started', 'session_id': session_id})}\n\n"

            # Run the STREAMING pipeline in a worker thread, passing the callback
            # This uses run_stream() which emits both stage AND token events
            pipeline_task = asyncio.ensure_future(
                asyncio.to_thread(rag_pipeline.run_stream, req.message, req.top_k, stage_callback, chat_history)
            )

            # Track time since last event for heartbeat
            last_event_time = asyncio.get_event_loop().time()

            # Yield stage/token events as they arrive from the queue
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    logger.info("[ChatStream] Client disconnected, stopping SSE.")
                    if pipeline_task and not pipeline_task.done():
                        pipeline_task.cancel()
                    return

                # Wait for next event with a timeout so we can check pipeline completion
                try:
                    event = await asyncio.wait_for(event_queue.get(), timeout=0.1)
                    yield f"data: {json.dumps(event)}\n\n"
                    last_event_time = asyncio.get_event_loop().time()
                except asyncio.TimeoutError:
                    # Send heartbeat if no events for HEARTBEAT_INTERVAL seconds
                    now = asyncio.get_event_loop().time()
                    if (now - last_event_time) >= HEARTBEAT_INTERVAL:
                        yield ": heartbeat\n\n"
                        last_event_time = now

                # If the pipeline task is done, drain any remaining events
                if pipeline_task.done():
                    while not event_queue.empty():
                        event = event_queue.get_nowait()
                        yield f"data: {json.dumps(event)}\n\n"
                    break

            # Get the final result from the pipeline
            result = pipeline_task.result()

            # Save the chatbot response to HANA Cloud
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

            # Inject session_id into result data
            result["session_id"] = session_id

            # Emit final_answer event (complete assembled text)
            final_answer_event = {
                "type": "final_answer",
                "content": result.get("reply", ""),
            }
            yield f"data: {json.dumps(final_answer_event)}\n\n"

            # Emit the full result payload (preserves backward compatibility)
            yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"

            # Signal completion
            yield f"data: {json.dumps({'type': 'request_completed'})}\n\n"

        except asyncio.CancelledError:
            logger.info("[ChatStream] SSE generation cancelled.")

        except Exception as e:
            logger.error(f"[ChatStream] Exception during SSE generation: {e}")

            # Emit a failed stage event so the frontend can show the error
            error_stage = {
                "type": "stage",
                "stage": "error",
                "status": "failed",
                "message": "An internal error occurred while processing your request.",
                "error": str(e),
            }
            yield f"data: {json.dumps(error_stage)}\n\n"

            # Emit error as result for backward compatibility
            err_payload = {
                "type": "result",
                "data": {
                    "reply": "I encountered an error processing your request. Please try rephrasing.",
                    "sources": [],
                    "intent": "error",
                    "type": "error",
                    "status": "error",
                    "processing": [{"stage": "error", "status": "error", "message": str(e)}],
                    "session_id": session_id
                }
            }
            yield f"data: {json.dumps(err_payload)}\n\n"
            yield f"data: {json.dumps({'type': 'request_completed'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
