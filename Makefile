PYTHON ?= $(shell if [ -f backend/.venv/bin/python ]; then echo backend/.venv/bin/python; else echo python3; fi)

.PHONY: help docs-check check dev-backend dev-frontend test

help:
	@echo "Available commands:"
	@echo "  make docs-check    - Run mechanical documentation validation"
	@echo "  make test          - Run backend unit and pipeline tests"
	@echo "  make check         - Run test suite, compile check, and docs validation"
	@echo "  make dev-backend   - Start FastAPI backend with hot-reload"
	@echo "  make dev-frontend  - Serve frontend HUD on port 3000"

docs-check:
	python3 scripts/docs_check.py

test:
	PYTHONPATH=backend $(PYTHON) -m unittest discover -s backend/tests -v

check:
	python3 -m py_compile backend/app/*.py backend/app/*/*.py scripts/docs_check.py backend/tests/*.py
	PYTHONPATH=backend $(PYTHON) -m unittest discover -s backend/tests -v
	python3 scripts/docs_check.py

dev-backend:
	PYTHONPATH=backend $(PYTHON) -m uvicorn app.main:app --app-dir backend --reload --port 8000

dev-frontend:
	python3 -m http.server 3000 --directory frontend
