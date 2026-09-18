import json
import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from api.models.request_models import ChatRequest
from api.rag.pipeline import rag_pipeline
from api.utils.logger import get_logger

logger = get_logger("routes.chat_stream")

router = APIRouter(prefix="/api/chat", tags=["Chatbot Stream"])


@router.post("/stream")
async def chat_stream(req: ChatRequest, request: Request):
    """
    Server-Sent Events (SSE) endpoint for real-time processing feedback & chat responses.
    Each pipeline stage emits events as they happen via a thread-safe asyncio.Queue,
    so the frontend receives updates in real time rather than after the pipeline completes.
    """
    # Queue bridges the sync pipeline thread → async SSE generator
    event_queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def stage_callback(event: dict) -> None:
        """Thread-safe callback invoked by the pipeline for each stage transition."""
        loop.call_soon_threadsafe(event_queue.put_nowait, event)

    async def event_generator():
        pipeline_task = None
        try:
            # Signal that processing has started
            yield f"data: {json.dumps({'type': 'request_started'})}\n\n"

            # Run the pipeline in a worker thread, passing the callback
            pipeline_task = asyncio.ensure_future(
                asyncio.to_thread(rag_pipeline.run, req.message, req.top_k, stage_callback)
            )

            # Yield stage events as they arrive from the queue
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
                except asyncio.TimeoutError:
                    pass

                # If the pipeline task is done, drain any remaining events
                if pipeline_task.done():
                    while not event_queue.empty():
                        event = event_queue.get_nowait()
                        yield f"data: {json.dumps(event)}\n\n"
                    break

            # Get the final result from the pipeline
            result = pipeline_task.result()

            # Emit final_answer event
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
                    "session_id": req.session_id or "default"
                }
            }
            yield f"data: {json.dumps(err_payload)}\n\n"
            yield f"data: {json.dumps({'type': 'request_completed'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
