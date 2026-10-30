**Back:** [00-overview](./00-overview.md)

# Runbook: Agent Docs-Sync Workflow

## 1. Goal
When to use: Run this checklist after **any** modification to code, configuration, schemas, or scripts to ensure repository documentation remains synchronized without requiring external sync services.

---

## 2. Source-Path to Docs-Subject Mapping Table

Use this matrix to immediately identify which documentation subject folder must be reviewed based on modified files:

| Modified Source Path | Primary Docs Folder | Target Reference Files |
| :--- | :--- | :--- |
| `backend/app/main.py` | `docs/03-interfaces/` | `docs/03-interfaces/api-routes.md`, `docs/03-interfaces/websocket-protocol.md` |
| `backend/app/config.py`, `backend/.env.example` | `docs/04-configuration/` | `docs/04-configuration/environment-variables.md` |
| `backend/app/schemas/models.py` | `docs/04-configuration/` | `docs/04-configuration/data-schemas.md` |
| `backend/app/services/meta_client.py` | `docs/02-services/` | `docs/02-services/meta-client.md` |
| `backend/app/services/sam_service.py` | `docs/02-services/` | `docs/02-services/sam-service.md` |
| `backend/app/services/reasoning_engine.py` | `docs/02-services/` | `docs/02-services/reasoning-engine.md` |
| `backend/app/services/modal_app.py` | `docs/02-services/` | `docs/02-services/modal-worker.md` |
| `frontend/` (all files) | `docs/03-interfaces/` | `docs/03-interfaces/frontend-hud.md` |
| Global architecture, data flows | `docs/01-architecture/` | `docs/01-architecture/system-topology.md`, `docs/01-architecture/streaming-pipeline.md` |
| New architectural decision, new dependencies | `docs/99-design-decisions/` | `docs/99-design-decisions/` (add new ADR) |
| Procedural recipes / how-tos | `docs/00-how-to/` | Corresponding recipe files |

---

## 3. The 6-Step Synchronization Checklist

Every agent completing a task must run through these exact 6 steps before completing its work:

### Step 1: Inspect Working Tree Changes
Inspect all modified, untracked, and deleted files using read-only git commands:
```bash
git status
git diff
git diff --cached
```

### Step 2: Map Modified Source Paths
Cross-reference every modified file against the **Source-Path to Docs-Subject Mapping Table** above to identify target documentation files.

### Step 3: Update Affected Docs
Update the corresponding reference docs:
- Add new functions, classes, models, and endpoints.
- Update changed parameter signatures, defaults, and response shapes.
- Remove obsolete references or symbols.

### Step 4: Reverse Coverage Check
Verify that all public entry points (routes in `backend/app/main.py`, exported services, and frontend scripts) are cited by path in at least one reference document.

### Step 5: ADR-Lite Logging
If the task introduced a significant architectural change, external dependency, or design tradeoff:
1. Create a new document in `docs/99-design-decisions/adr-<NNN>-<title>.md` (following the pattern in `docs/99-design-decisions/adr-001-fastapi-websocket-streaming.md`).
2. Follow the 3-section structure: `## Context`, `## Decision`, `## Consequences`.
3. Add the entry to the Table of Contents in `docs/99-design-decisions/00-overview.md`.

### Step 6: Execute the Mechanical Validator
Run the automated validator to confirm zero broken links, intact backlinks, and complete path existence:
```bash
python3 scripts/docs_check.py
```
Resolve any validation errors immediately.

---

## 4. Mandatory Final Output Line
Conclude your agent response with this exact status format:
```
Docs checked/updated: <list of files updated, or "none required (<concise reason>)">
```

## Deep-Dive Links
- Master Router: [AGENTS.md](../../AGENTS.md)
- Validator: [scripts/docs_check.py](../../scripts/docs_check.py)
