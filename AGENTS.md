# AGENTS.md — OmniSpatial Central Agent Router

> **Single Source of Truth for Any AI Agent Working in This Repository**

---

## 1. Project Snapshot

- **Project:** OmniSpatial — Real-Time Zero-Shot Physical AI Copilot
- **Archetype:** Multimodal Real-Time Computer Vision & Spatial Reasoning Pipeline (FastAPI Backend + HTML5 Canvas HUD Frontend)
- **Primary Languages:** Python 3.10+ (Backend & Scripts), Vanilla JavaScript / HTML5 / CSS (Frontend)
- **Package Manager & Toolchain:** `pip` with `backend/requirements.txt`
- **Environment Setup:**
  ```bash
  cp backend/.env.example backend/.env
  pip install -r backend/requirements.txt
  ```
- **Run / Dev Commands:**
  - Backend API & WebSocket Server:
    ```bash
    PYTHONPATH=backend uvicorn app.main:app --app-dir backend --reload --port 8000
    ```
  - Frontend Client:
    ```bash
    python3 -m http.server 3000 --directory frontend
    ```
- **Verification Commands:**
  - **Syntax & Compilation Check:**
    ```bash
    python3 -m py_compile backend/app/*.py backend/app/*/*.py scripts/docs_check.py
    ```
  - **Backend Health Check:**
    ```bash
    curl -s http://localhost:8000/health
    ```
  - **Mechanical Docs Validation:**
    ```bash
    python3 scripts/docs_check.py
    ```

---

## 2. Knowledge Base Index

> 💡 **Executing a common modification or workflow? Start with [docs/00-how-to/00-overview.md](docs/00-how-to/00-overview.md).**

| Folder | Subject Area | Read This When... |
| :--- | :--- | :--- |
| [docs/00-how-to/](docs/00-how-to/00-overview.md) | How-To Recipes & Runbooks | Adding a task step, adding Meta model endpoints, testing local simulation, deploying GPU workers, or syncing docs. |
| [docs/01-architecture/](docs/01-architecture/00-overview.md) | System Architecture | Changing system topology, modifying client/server boundaries, or altering real-time streaming pipeline flows. |
| [docs/02-services/](docs/02-services/00-overview.md) | Core Services | Working on Meta Model API integration (`backend/app/services/meta_client.py`), SAM 3.1 spatial topology (`backend/app/services/sam_service.py`), procedural reasoning (`backend/app/services/reasoning_engine.py`), or Modal GPU workers (`backend/app/services/modal_app.py`). |
| [docs/03-interfaces/](docs/03-interfaces/00-overview.md) | Interfaces & Protocols | Modifying FastAPI REST endpoints (`backend/app/main.py`), WebSocket `/ws/stream` message formats, or HTML5 Canvas HUD rendering (`frontend/app.js`). |
| [docs/04-configuration/](docs/04-configuration/00-overview.md) | Configuration & Schemas | Updating environment variables (`backend/app/config.py`, `backend/.env.example`) or changing Pydantic data models (`backend/app/schemas/models.py`). |
| [docs/99-design-decisions/](docs/99-design-decisions/00-overview.md) | Design Decisions (ADRs) | Reviewing architectural rationale, tradeoffs, or logging new Architecture Decision Records. |

---

## 3. Numbered Working Rules

### Rule 0 — Git is Strictly Read-Only
**NEVER** run `git commit`, `git push`, `git add`, `git stage`, `git stash`, `git checkout`, `git reset`, or create branches/tags. You may **ONLY** run read-only inspection commands (`git status`, `git diff`, `git log`, `git show`). The user handles all staging and commits manually.

### Rule 1 — Mandatory Post-Task Docs-Sync Rule
After **ANY** task that modifies code, configuration, schemas, or scripts:
1. Follow the 6-step checklist in [docs/00-how-to/sync-docs-runbook.md](docs/00-how-to/sync-docs-runbook.md).
2. Execute `python3 scripts/docs_check.py` and ensure zero errors.
3. Conclude your final response with an explicit status line:
   ```
   Docs checked/updated: <list of files or "none required (reason)">
   ```

### Rule 2 — Zero Hallucination Policy
Never invent or guess file paths, CLI flags, environment variables, or function signatures. Inspect the actual source code file on disk before documenting or modifying it.

### Rule 3 — In-Place Maintenance
Edit existing documents and code in place rather than creating duplicate, redundant, or orphaned files. Keep all documentation technical, dense, and code-grounded.
