# Subject: Interfaces & Protocols

**Primary Source Paths Covered:**
- `backend/app/main.py`
- `frontend/`
- `frontend/index.html`
- `frontend/app.js`
- `frontend/styles.css`

**Purpose:**
Read this when adding or altering HTTP REST routes, updating WebSocket streaming message contracts, changing client canvas overlay rendering, or modifying HUD components.

## Table of Contents

| Document | Description |
| :--- | :--- |
| [api-routes.md](./api-routes.md) | FastAPI REST endpoints (`GET /health`, `GET /api/steps`) and middleware configurations |
| [websocket-protocol.md](./websocket-protocol.md) | Real-time WebSocket `/ws/stream` protocol, payload schemas, and serialization format |
| [frontend-hud.md](./frontend-hud.md) | HTML5 Canvas overlay engine, video capture lifecycle, and state simulation in `frontend/` |
