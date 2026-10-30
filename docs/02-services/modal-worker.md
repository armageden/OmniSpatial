**Back:** [00-overview](./00-overview.md)

# Modal GPU Worker (`modal_app.py`)

## File Location
`backend/app/services/modal_app.py`

## Overview
Defines serverless cloud GPU worker functions using the Modal framework (`modal>=0.62.0`). This offloads computation-heavy computer vision transformations and local segmentation models to cloud GPUs without managing persistent servers.

## App Definition
```python
import modal
app = modal.App("omnispatial-meta-hackathon")
```

## Container Image Specification
- **Base OS:** `modal.Image.debian_slim(python_version="3.11")`
- **Installed Packages:** `fastapi`, `uvicorn`, `numpy`, `pillow`, `opencv-python-headless`, `httpx`, `pycocotools`.

## Functions & Endpoints

### 1. `process_frame_gpu(image_bytes: bytes, target_label: str = "components") -> dict`
- **GPU Target:** `T4` (configurable to `A10G` or `L4`).
- **Execution Limits:** `timeout=60`, `scaledown_window=120`.
- **Purpose:** Accelerated hardware inference for raw frame decoding, Laplacian blur/sharpness scoring, and candidate edge feature extraction.

### 2. `api_process_frame(payload: dict)`
- **Decorator:** `@modal.fastapi_endpoint(method="POST")`
- **Purpose:** Public HTTP POST endpoint accepting base64 images for GPU frame processing.

### 3. `health() -> dict`
- **Decorator:** `@modal.fastapi_endpoint(method="GET")`
- **Purpose:** Public HTTP health check returning service status and GPU enablement.

## Deployment Commands
- Shell script helper: `bash scripts/deploy_modal.sh`
- Local testing: `modal run backend/app/services/modal_app.py`
- Production deploy: `modal deploy backend/app/services/modal_app.py`

## Cross-References
- Deployment recipe: [docs/00-how-to/deploy-modal-gpu-worker.md](../00-how-to/deploy-modal-gpu-worker.md).
- Configuration keys: [docs/04-configuration/environment-variables.md](../04-configuration/environment-variables.md).
