# Subject: Core Services

**Primary Source Paths Covered:**
- `backend/app/services/`
- `backend/app/services/meta_client.py`
- `backend/app/services/sam_service.py`
- `backend/app/services/reasoning_engine.py`
- `backend/app/services/modal_app.py`

**Purpose:**
Read this when modifying backend business logic, integrating Meta foundation models, calculating spatial topology between objects, modifying procedural task verification, or deploying serverless GPU jobs.

## Table of Contents

| Document | Description |
| :--- | :--- |
| [meta-client.md](./meta-client.md) | Client implementation for Meta Model API (SAM 3.1, Muse Spark, Muse Image) with mock fallback |
| [sam-service.md](./sam-service.md) | Frame segmentation, polygon contour processing, and pairwise spatial topology calculation |
| [reasoning-engine.md](./reasoning-engine.md) | Procedural step verification, anomaly detection, and state machine transitions |
| [modal-worker.md](./modal-worker.md) | Serverless GPU deployment configuration on Modal |
