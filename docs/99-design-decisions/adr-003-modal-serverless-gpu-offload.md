**Back:** [00-overview](./00-overview.md)

# ADR-003: Modal Serverless GPU Offload

## Context
Video frame processing, high-resolution image decoding, and local open-weight vision model execution require hardware GPU acceleration. Maintaining dedicated cloud VM instances (e.g. AWS EC2 g4dn) is costly, complex to manage, and slow to scale during intermittent hackathon testing.

## Decision
Utilize Modal (`modal>=0.62.0`) as defined in `backend/app/services/modal_app.py` leveraging the $100 hackathon partner credits. Functions scale to zero when idle, cold-start in seconds, and attach to T4/A10G GPUs on demand.

## Consequences
- **Positive:** Zero idle infrastructure costs, automatic containerization, straightforward Python-native deployment decorators, and seamless GPU access.
- **Negative:** Cold start latency on initial request invocation (~5-15s), after which warm containers execute with native GPU speed.
- **Status note:** Modal is an *optional* offload/deployment (`backend/app/services/modal_app.py`); the real-time WebSocket frame path in `backend/app/main.py` does not invoke it, to avoid adding a network round-trip to the 5 FPS loop. Treat Modal as opt-in.
