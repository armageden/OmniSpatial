**Back:** [00-overview](./00-overview.md)

# ADR-001: FastAPI WebSocket Streaming Architecture

## Context
OmniSpatial requires continuous frame transmission from client video streams to the inference engine and rapid delivery of spatial masks back to the browser canvas. Traditional HTTP POST polling introduces connection overhead and latency jitter. Full WebRTC data channels introduce substantial media signaling complexity for a 10-day hackathon timeline.

## Decision
Adopt bidirectional WebSockets hosted via FastAPI (`backend/app/main.py` at `/ws/stream`). Client frames are encoded in base64 and pushed at 2-5 FPS, allowing immediate push of polygon mask coordinates and verification states over a persistent TCP socket.

## Consequences
- **Positive:** Sub-second latency roundtrips, trivial client-side implementation with vanilla JavaScript `WebSocket` API, zero extra media signaling infrastructure.
- **Negative:** Slightly higher bandwidth utilization compared to raw binary WebRTC video codecs, but well within local/broadband capacity for hackathon demonstrations.
