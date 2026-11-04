import json
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.sam_service import sam_service
from app.services.reasoning_engine import reasoning_engine, ReasoningEngine
from app.services.meta_client import meta_client
from app.schemas.models import TargetImageResponse, StreamActionRequest, FrameAnalysisPayload

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omnispatial")

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await meta_client.close()

app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

_cors_origins = [o.strip() for o in settings.cors_allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials="*" not in _cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "app": settings.app_name,
        "mock_mode": meta_client.is_mock
    }

@app.get("/api/steps")
async def get_steps():
    return {
        "steps": [s.model_dump() for s in reasoning_engine.steps],
        "active_step": reasoning_engine.get_active_step().model_dump()
    }

@app.post("/api/steps/next")
async def next_step():
    active = reasoning_engine.advance_step()
    return {"status": "ok", "active_step": active.model_dump()}

@app.post("/api/steps/prev")
async def prev_step():
    active = reasoning_engine.previous_step()
    return {"status": "ok", "active_step": active.model_dump()}

@app.post("/api/steps/reset")
async def reset_workflow():
    active = reasoning_engine.reset_workflow()
    return {"status": "ok", "active_step": active.model_dump()}

@app.post("/api/steps/set/{step_number}")
async def set_step(step_number: int):
    active = reasoning_engine.set_step(step_number)
    return {"status": "ok", "active_step": active.model_dump()}

@app.post("/api/action")
async def execute_action(request: StreamActionRequest):
    if request.action == "next_step":
        active = reasoning_engine.advance_step()
    elif request.action == "prev_step":
        active = reasoning_engine.previous_step()
    elif request.action == "reset_workflow":
        active = reasoning_engine.reset_workflow()
    elif request.action == "set_step":
        active = reasoning_engine.set_step(request.step_number or 1)
    elif request.action == "set_workflow":
        active = await reasoning_engine.load_custom_workflow(request.task_goal or "")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported action: {request.action}")
    return {"status": "ok", "active_step": active.model_dump(), "steps": [s.model_dump() for s in reasoning_engine.steps]}

@app.get("/api/steps/{step_number}/target-image", response_model=TargetImageResponse)
async def get_target_image(step_number: int, prompt: Optional[str] = None):
    if not prompt:
        if step_number < 1 or step_number > len(reasoning_engine.steps):
            raise HTTPException(status_code=404, detail="Step not found")
        step = reasoning_engine.steps[step_number - 1]
        prompt = f"Perspective engineering diagram of circuit board: {step.title}. {step.description}"
    was_cached = meta_client.is_target_image_cached(step_number, prompt=prompt)
    image_url = await meta_client.generate_target_image_muse(prompt, step_number=step_number)
    return TargetImageResponse(
        step_number=step_number,
        image_data_url=image_url,
        source="muse_image_1.0",
        is_cached=was_cached
    )

@app.websocket("/ws/stream")
async def websocket_stream_endpoint(websocket: WebSocket):
    """
    Real-time Dual-Loop bidirectional WebSocket connection:
    - Fast Loop: Streams video frames, computes SAM 3.1 masks and spatial vectors (~150-250ms)
    - Slow Reasoning Loop: Asynchronously executes Muse Spark verification on trigger without blocking video
    """
    await websocket.accept()
    logger.info("Client connected to OmniSpatial dual-loop stream.")

    # Per-connection reasoning state (isolates concurrent clients)
    reasoning_engine = ReasoningEngine()

    # Track any pending verification background task to avoid overlapping calls
    verification_task: Optional[asyncio.Task] = None
    last_verify_time: float = 0.0

    async def run_async_verification(segments, spatial_relations, auto_advance: bool, image_base64: str = ""):
        try:
            logger.info("Dispatching async Muse Spark verification...")
            verification = await reasoning_engine.verify_step(
                segments=segments,
                spatial_relations=spatial_relations,
                auto_advance=auto_advance,
                image_base64=image_base64
            )
            update_payload = {
                "type": "verification_result",
                "verification": verification.model_dump(),
                "active_step": reasoning_engine.get_active_step().model_dump()
            }
            await websocket.send_json(update_payload)
            logger.info(f"Verification completed. Result verified: {verification.is_verified}")
        except (WebSocketDisconnect, RuntimeError):
            logger.info("Client disconnected before verification result could be delivered.")
        except Exception as err:
            logger.error(f"Error during async verification: {err}")

    try:
        while True:
            data_text = await websocket.receive_text()
            if len(data_text) > 3_000_000:
                await websocket.send_json({"type": "error", "message": "message too large"})
                continue
            try:
                payload = json.loads(data_text)
            except (json.JSONDecodeError, ValueError):
                await websocket.send_json({"type": "error", "message": "invalid JSON"})
                continue
            if not isinstance(payload, dict):
                await websocket.send_json({"type": "error", "message": "payload must be object"})
                continue

            action = payload.get("action")
            # Handle control actions
            if action in ("next_step", "prev_step", "reset_workflow", "set_step", "set_workflow"):
                try:
                    action_req = StreamActionRequest.model_validate(payload)
                except Exception as val_err:
                    await websocket.send_json({"type": "error", "message": f"invalid action payload: {val_err}"})
                    continue

                if action_req.action == "next_step":
                    active = reasoning_engine.advance_step()
                    await websocket.send_json({"type": "step_updated", "active_step": active.model_dump()})
                    continue
                elif action_req.action == "prev_step":
                    active = reasoning_engine.previous_step()
                    await websocket.send_json({"type": "step_updated", "active_step": active.model_dump()})
                    continue
                elif action_req.action == "reset_workflow":
                    active = reasoning_engine.reset_workflow()
                    await websocket.send_json({"type": "step_updated", "active_step": active.model_dump()})
                    continue
                elif action_req.action == "set_step":
                    num = int(action_req.step_number or 1)
                    active = reasoning_engine.set_step(num)
                    await websocket.send_json({"type": "step_updated", "active_step": active.model_dump()})
                    continue
                elif action_req.action == "set_workflow":
                    active = await reasoning_engine.load_custom_workflow(action_req.task_goal or "")
                    await websocket.send_json({
                        "type": "step_updated",
                        "active_step": active.model_dump(),
                        "steps": [s.model_dump() for s in reasoning_engine.steps]
                    })
                    continue

            # Validate frame analysis request
            try:
                frame_req = FrameAnalysisPayload.model_validate(payload)
            except Exception as val_err:
                await websocket.send_json({"type": "error", "message": f"invalid frame payload: {val_err}"})
                continue

            image_base64 = frame_req.image_base64
            frame_id = frame_req.frame_id
            width = frame_req.width
            height = frame_req.height
            normalize = frame_req.normalize
            smooth = frame_req.smooth
            trigger_verify = frame_req.trigger_verify or (frame_req.action == "verify_step")
            allow_fallback = frame_req.allow_fallback or meta_client.is_mock

            if not image_base64:
                continue
            if len(image_base64) > 2_500_000:
                await websocket.send_json({"type": "error", "message": "image payload too large"})
                continue

            active_step = reasoning_engine.get_active_step()
            custom_prompt = frame_req.custom_prompt
            if custom_prompt and str(custom_prompt).strip():
                target_label = str(custom_prompt).strip()
                target_components = [t.strip() for t in target_label.split(",") if t.strip()]
            else:
                target_components = active_step.target_components
                clean_terms = [c.replace("_", " ") for c in target_components]
                target_label = ", ".join(clean_terms)

            force_mock = bool(frame_req.feed_mode and frame_req.feed_mode.startswith("demo") and not custom_prompt)

            # 1. Fast Vision Loop: SAM 3.1 & Spatial Geometry
            segments = await sam_service.process_frame(
                image_base64=image_base64,
                frame_width=width,
                frame_height=height,
                normalize=normalize,
                smooth=smooth,
                target_label=target_label,
                target_components=target_components,
                allow_fallback=allow_fallback,
                force_mock=force_mock
            )

            # 2. Compute spatial topology & vectors
            spatial_relations = sam_service.compute_spatial_relationships(segments)

            # 3. Check for verification trigger (Debounced asynchronous non-blocking dispatch)
            if trigger_verify:
                now_t = asyncio.get_event_loop().time()
                if now_t - last_verify_time >= 0.8:
                    last_verify_time = now_t
                    if verification_task is None or verification_task.done():
                        verification_task = asyncio.create_task(
                            run_async_verification(
                                segments=segments,
                                spatial_relations=spatial_relations,
                                auto_advance=bool(payload.get("auto_advance", False)),
                                image_base64=image_base64
                            )
                        )

            # 4. Stream fast frame analysis back immediately
            response_payload = {
                "type": "frame_analysis",
                "frame_id": frame_id,
                "frame_width": width,
                "frame_height": height,
                "segments": [s.model_dump() for s in segments],
                "spatial_relations": spatial_relations,
                "active_step": active_step.model_dump(),
                "last_verification": reasoning_engine.last_verification.model_dump() if reasoning_engine.last_verification else None
            }
            await websocket.send_json(response_payload)

    except WebSocketDisconnect:
        logger.info("Client disconnected from OmniSpatial stream.")
    except Exception as e:
        logger.error(f"Error in stream processing: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
    finally:
        if verification_task is not None and not verification_task.done():
            verification_task.cancel()
            try:
                await verification_task
            except (asyncio.CancelledError, Exception):
                pass
