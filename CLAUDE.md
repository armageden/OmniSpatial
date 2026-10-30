# CLAUDE.md — OmniSpatial Instructions

See [AGENTS.md](./AGENTS.md) for authoritative project architecture, build commands, and rules.

## Core Rules for Claude
1. **Rule 0 — Git is Strictly Read-Only:** NEVER commit, stage, push, or reset (`git commit`, `git add`, `git push`, etc.). Only read-only inspections (`git status`, `git diff`, `git log`) are allowed.
2. **Mandatory Post-Task Docs-Sync:** After any code or configuration change, follow [docs/00-how-to/sync-docs-runbook.md](docs/00-how-to/sync-docs-runbook.md), execute `python3 scripts/docs_check.py`, and conclude your response with:
   `Docs checked/updated: <list of files or "none required (reason)">`
3. **Verification Command:**
   ```bash
   make check
   # or:
   python3 scripts/docs_check.py
   ```
