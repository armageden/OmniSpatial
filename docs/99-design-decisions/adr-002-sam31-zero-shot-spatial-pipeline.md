**Back:** [00-overview](./00-overview.md)

# ADR-002: SAM 3.1 Zero-Shot Spatial Pipeline

## Context
Physical assembly tasks involve hundreds of diverse hardware components, micro-switches, capacitors, fasteners, and tools. Training or fine-tuning traditional object detection models (e.g. YOLO, Mask R-CNN) for every possible kit is intractable in short timelines and brittle when lighting or viewing angles change.

## Decision
Use Meta's Segment Anything Model (SAM 3.1) via the Meta Model API wrapped in `backend/app/services/sam_service.py`. Segmented masks are transformed into vector polygons and paired with pairwise spatial metrics before being sent to Muse Spark for semantic identification and assembly verification.

## Consequences
- **Positive:** Zero training data required. Works out-of-the-box on novel components and real-world environments. Generates exact pixel contours rather than crude axis-aligned boxes.
- **Negative:** Requires external Meta Model API access or serverless GPU compute, mitigated by an internal mock fallback mode in `backend/app/services/meta_client.py` for offline development.
