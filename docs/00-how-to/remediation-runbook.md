**Back:** [00-overview](./00-overview.md)

# Remediation Runbook

Maps audit findings to files/functions and verification.

| # | Finding | Files | Verification |
|---|---------|-------|--------------|
| 1 | RLE masks never decoded | `backend/app/services/meta_client.py` (`segment_frame_sam`, `decode_rle_mask`) | `test_rle_mask_production_path_decodes_real_contour` |
| 2 | CORS wildcard + credentials | `backend/app/config.py`, `backend/app/main.py` | py_compile + manual |
| 3 | XSS in legend | `frontend/app.js` (`updateLegend`, `escapeHtml`) | manual payload test |
| 4 | Modal false GPU claim | `backend/app/services/modal_app.py` | `test_modal_frame_processing_function` |
| 5 | Shared global state | `backend/app/main.py`, `backend/app/services/reasoning_engine.py` | `test_websocket_smoke` |
| 6 | Unsafe JSON/int parsing | `backend/app/main.py` | `test_websocket_smoke` |
| 7 | Buggy Moore-Neighbor tracer | `backend/app/services/sam_service.py` (`trace_binary_mask`) | `test_trace_binary_mask_circle` |
| 8 | Unbounded smoothing params | `backend/app/services/sam_service.py` | `test_smoothing_bounds` |
| 9 | docs_check backend/.env | `docs/00-how-to/deploy-modal-gpu-worker.md` | `scripts/docs_check.py` |
| 10 | README React claim | `README.md` | manual |

## Commands
- Tests: `PYTHONPATH=backend python -m unittest discover -s backend/tests -v`
- Docs: `python3 scripts/docs_check.py`
- Compile: `python3 -m py_compile backend/app/*.py backend/app/*/*.py scripts/docs_check.py`