**Back:** [00-overview](./00-overview.md)

# Streaming Pipeline

## Data Lifecycle

The streaming pipeline processes real-time video frames using a Dual-Loop architecture:
1. **Fast Vision Stream:** Returns zero-shot SAM 3.1 masks and spatial vectors within ~150-250ms.
2. **Asynchronous Reasoning Stream:** Dispatches Muse Spark physical reasoning in a non-blocking background task upon explicit verification trigger.

```mermaid
sequenceDiagram
    autonumber
    actor User as Technician / User
    participant Browser as frontend/app.js (Canvas HUD)
    participant WS as WebSocket /ws/stream (backend/app/main.py)
    participant SAM as sam_service.py
    participant Reason as reasoning_engine.py
    participant Meta as meta_client.py

    User->>Browser: Show component to camera
    Note over Browser: Check isAwaitingResponse guard
    Browser->>WS: Send JSON {frame_id, image_base64, trigger_verify}
    
    par Fast Vision Loop (~180ms)
        WS->>SAM: process_frame(image_base64)
        SAM->>Meta: segment_frame_sam(image_base64)
        Meta-->>SAM: List[SegmentedObject]
        SAM->>SAM: compute_spatial_relationships(segments)
        WS-->>Browser: Fast Response {frame_id, segments, spatial_relations}
        Browser->>User: Render polygon overlay & spatial vectors
    and Async Reasoning Loop (On Trigger ~3.5s)
        opt When trigger_verify == true
            WS->>Reason: verify_step(segments, spatial_relations)
            Reason->>Meta: reason_physical_state_muse_spark(...)
            Meta-->>Reason: Verification JSON
            Reason-->>WS: VerificationResult
            WS-->>Browser: Push {type: "verification_result", verification}
            Browser->>User: Play Audio Chime & Render Feedback
        end
    end
```

## Protocol Characteristics
- **Transport:** WebSocket (`ws://` or `wss://`) over `/ws/stream`.
- **Payload Format:** JSON serialized string.
- **Client Render Loop:** Managed via `renderLoop(now)` in `frontend/app.js` using `requestAnimationFrame`.
- **Sampling Frequency:** Typically 4 to 5 frames per second.
- **Backpressure Handling:** Enforced by client-side `isAwaitingResponse` lock in `frontend/app.js`, dropping stale frames when backend is busy.
- **Demo Mode:** Built-in procedural scenario playback via `frontend/demo_clips.js`.

## Cross-References
- API message schemas: [docs/03-interfaces/websocket-protocol.md](../03-interfaces/websocket-protocol.md).
- Data models: [docs/04-configuration/data-schemas.md](../04-configuration/data-schemas.md).
