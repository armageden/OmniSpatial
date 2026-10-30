# Subject: Architecture Design Decisions (ADR-Lite)

**Primary Source Paths Covered:**
- Entire repository (`backend/`, `frontend/`, `docs/`)

**Purpose:**
Read this to understand historical design choices, technology tradeoffs, and architectural decisions made throughout the lifecycle of OmniSpatial.

## Table of Contents

| Document | Description |
| :--- | :--- |
| [adr-001-fastapi-websocket-streaming.md](./adr-001-fastapi-websocket-streaming.md) | Selection of FastAPI WebSockets over HTTP polling or WebRTC for sub-second frame streaming |
| [adr-002-sam31-zero-shot-spatial-pipeline.md](./adr-002-sam31-zero-shot-spatial-pipeline.md) | Choice of SAM 3.1 zero-shot segmentation rather than custom fine-tuned object detection |
| [adr-003-modal-serverless-gpu-offload.md](./adr-003-modal-serverless-gpu-offload.md) | Adoption of Modal serverless GPUs for heavy vision processing and burst workloads |
| [adr-004-dual-loop-streaming-and-backpressure.md](./adr-004-dual-loop-streaming-and-backpressure.md) | Dual-loop decoupled streaming architecture and client-side backpressure control |
