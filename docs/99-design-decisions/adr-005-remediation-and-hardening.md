**Back:** [00-overview](./00-overview.md)

# ADR-005: Remediation and Hardening

## Status
Accepted (2026-11-02)

## Context
A full code audit identified a critical functional defect (SAM 3.1 RLE masks never decoded in production), security gaps (CORS wildcard + credentials, XSS in legend, unvalidated Modal endpoint), concurrency issues (shared global ReasoningEngine), and documentation/CI drift.

## Decisions
1. **Mask decode contract**: `segment_frame_sam` constructs `H,W,COUNTS` from the box's `w`/`h` groups and decodes via `decode_rle_mask(..., offset_x, offset_y)`. Fallback to octagon remains when dimensions or data are missing.
2. **CORS**: allow-list from `settings.cors_allowed_origins`; credentials disabled when wildcard present.
3. **State isolation**: each WebSocket connection instantiates its own `ReasoningEngine`; REST endpoints keep the module global for compatibility.
4. **Modal honesty**: removed `gpu="T4"` claim; `device` reported as `cpu`; endpoints validate payload size/base64 and support optional shared-secret auth.
5. **Frontend safety**: legend labels escaped; WebSocket payloads parsed defensively; exponential reconnect backoff; configurable API base.
6. **Contour tracing**: replaced buggy Moore-Neighbor tracer with OpenCV `findContours`.

## Consequences
- Real SAM 3.1 masks now render as contours; mock mode unaffected.
- Multi-client sessions no longer corrupt shared step state.
- CI must run the test suite (not yet wired — tracked in remediation runbook).