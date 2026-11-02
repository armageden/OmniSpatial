import json
import asyncio
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.sam_service import sam_service
from app.services.reasoning_engine import reasoning_engine, ReasoningEngine
from app.services.meta_client import meta_client
from app.schemas.models import TargetImageResponse, StreamActionRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omnispatial")

app = FastAPI(title=settings.app_name, debug=settings.debug)

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

@app.get("/api/steps/{step_number}/target-image", response_model=TargetImageResponse)
async def get_target_image(step_number: int):
    if step_number < 1 or step_number > len(reasoning_engine.steps):
        raise HTTPException(status_code=404, detail="Step not found")
    step = reasoning_engine.steps[step_number - 1]
    prompt = f"Perspective engineering diagram of circuit board: {step.title}. {step.description}"
    image_url = await meta_client.generate_target_image_muse(prompt, step_number=step_number)
    return TargetImageResponse(
        step_number=step_number,
        image_data_url=image_url,
        source="muse_image_1.0",
        is_cached=True
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

    async def run_async_verification(segments, spatial_relations, auto_advance: bool):
        try:
            logger.info("Dispatching async Muse Spark verification...")
            verification = await reasoning_engine.verify_step(
                segments=segments,
                spatial_relations=spatial_relations,
                auto_advance=auto_advance
            )
            update_payload = {
                "type": "verification_result",
                "verification": verification.model_dump(),
                "active_step": reasoning_engine.get_active_step().model_dump()
            }
            await websocket.send_json(update_payload)
            logger.info(f"Verification completed. Result verified: {verification.is_verified}")
        except Exception as err:
            logger.error(f"Error during async verification: {err}")

    try:
        while True:
            data_text = await websocket.receive_text()
            if len(data_text) > 1_000_000:
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
            if action == "next_step":
                active = reasoning_engine.advance_step()
                await websocket.send_json({"type": "step_updated", "active_step": active.model_dump()})
                continue
            elif action == "prev_step":
                active = reasoning_engine.previous_step()
                await websocket.send_json({"type": "step_updated", "active_step": active.model_dump()})
                continue
            elif action == "reset_workflow":
                active = reasoning_engine.reset_workflow()
                await websocket.send_json({"type": "step_updated", "active_step": active.model_dump()})
                continue
            elif action == "set_step":
                try:
                    num = int(payload.get("step_number", 1))
                except (ValueError, TypeError):
                    await websocket.send_json({"type": "error", "message": "invalid step_number"})
                    continue
                active = reasoning_engine.set_step(num)
                await websocket.send_json({"type": "step_updated", "active_step": active.model_dump()})
                continue

            image_base64 = payload.get("image_base64", "")
            frame_id = payload.get("frame_id", 0)
            width = payload.get("width")
            height = payload.get("height")
            normalize = bool(payload.get("normalize", False))
            smooth = bool(payload.get("smooth", True))
            trigger_verify = bool(payload.get("trigger_verify", False)) or (action == "verify_step")
            allow_fallback = bool(payload.get("allow_fallback", False)) or meta_client.is_mock

            if not image_base64:
                continue
            if len(image_base64) > 500_000:
                await websocket.send_json({"type": "error", "message": "image payload too large"})
                continue

            active_step = reasoning_engine.get_active_step()
            custom_prompt = payload.get("custom_prompt")
            if custom_prompt and str(custom_prompt).strip():
                target_label = str(custom_prompt).strip()
                target_components = [t.strip() for t in target_label.split(",") if t.strip()]
            else:
                target_label = f"circuit board, {', '.join(active_step.target_components)}, parts, pins"
                target_components = active_step.target_components

            # 1. Fast Vision Loop: SAM 3.1 & Spatial Geometry
            segments = await sam_service.process_frame(
                image_base64=image_base64,
                frame_width=width,
                frame_height=height,
                normalize=normalize,
                smooth=smooth,
                target_label=target_label,
                target_components=target_components,
                allow_fallback=allow_fallback
            )

            # 2. Compute spatial topology & vectors
            spatial_relations = sam_service.compute_spatial_relationships(segments)

            # 3. Check for verification trigger (Asynchronous non-blocking dispatch)
            if trigger_verify:
                if verification_task is None or verification_task.done():
                    verification_task = asyncio.create_task(
                        run_async_verification(
                            segments=segments,
                            spatial_relations=spatial_relations,
                            auto_advance=bool(payload.get("auto_advance", False))
                        )
                    )

            # 4. Stream fast frame analysis back immediately
            response_payload = {
                "type": "frame_analysis",
                "frame_id": frame_id,
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
