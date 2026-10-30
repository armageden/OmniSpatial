**Back:** [00-overview](./00-overview.md)

# ADR-004: Dual-Loop Streaming Pipeline and Client-Side Backpressure

## Context
Running zero-shot SAM 3.1 segmentation (~200ms) and Muse Spark physical reasoning (~3.8s) sequentially on every frame in a 4 FPS WebSocket loop causes severe stream blocking. Within seconds, unacknowledged frames accumulate in the network buffer, causing video freezes, desynchronization, and memory exhaustion.

## Decision
1. **Decouple into a Dual-Loop Architecture:**
   - **Fast Vision Loop:** Evaluates SAM 3.1 masks and spatial topology metrics on every frame and returns HUD overlays within ~150-250ms.
   - **Slow Reasoning Loop:** Asynchronously executes Muse Spark verification via `asyncio.create_task` only upon user trigger (Spacebar / "Verify Step") or camera stillness, pushing results back to the client over WebSocket without pausing the video stream.
2. **Enforce Client-Side Backpressure:**
   - Implement an `isAwaitingResponse` lock in `frontend/app.js` to drop stale frames if the server has not yet acknowledged the previous frame.

## Consequences
- **Positive:** Video stream remains fluid at 5 FPS with sub-250ms latency. Server memory remains bounded.
- **Positive:** Real-time physical feedback is delivered without disrupting spatial AR tracking.
- **Tradeoff:** Verification is event-driven rather than continuous per-frame.
