**Back:** [00-overview](./00-overview.md)

# WebSocket Protocol (`/ws/stream`)

## Endpoint
- **URL:** `ws://<host>:<port>/ws/stream`
- **Handler:** `websocket_stream_endpoint(websocket: WebSocket)` in `backend/app/main.py`.

## Message Flow

### 1. Client Frame Ingestion
The client streams video frames serialized as JSON over the WebSocket, with optional control action flags:
```json
{
  "frame_id": 42,
  "timestamp": 1729500000.123,
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "active_step": 1,
  "width": 640,
  "height": 400,
  "normalize": false,
  "smooth": true,
  "trigger_verify": false,
  "allow_fallback": true,
  "custom_prompt": null
}
```

Client can also send explicit action commands:
```json
{"action": "verify_step"}
{"action": "next_step"}
{"action": "prev_step"}
{"action": "reset_workflow"}
```

### 2. Dual-Loop Server Response Payloads

#### A. Fast Spatial Stream (`type: "frame_analysis"`)
Delivers sub-250ms SAM 3.1 polygon masks and spatial topology vectors:
```json
{
  "type": "frame_analysis",
  "frame_id": 42,
  "segments": [
    {
      "id": "comp_1",
      "label": "microcontroller_chip",
      "confidence": 0.96,
      "bbox": {"x_min": 180.0, "y_min": 140.0, "x_max": 300.0, "y_max": 260.0},
      "polygon": [{"x": 195.0, "y": 140.0}, {"x": 285.0, "y": 140.0}, ...],
      "centroid": {"x": 240.0, "y": 200.0}
    }
  ],
  "spatial_relations": {
    "comp_1:comp_2": {
      "distance_px": 85.2,
      "dx": 80.0,
      "dy": -29.0,
      "iou": 0.0,
      "is_overlapping": false,
      "relative_bearing_deg": -19.9
    }
  },
  "active_step": {
    "step_number": 1,
    "title": "Mount Main IC Chip",
    "status": "in_progress"
  },
  "last_verification": null
}
```

#### B. Asynchronous Physical Verification (`type: "verification_result"`)
Broadcast asynchronously when Muse Spark completes physical analysis without blocking the frame stream:
```json
{
  "type": "verification_result",
  "verification": {
    "step_number": 1,
    "is_verified": true,
    "confidence": 0.96,
    "feedback": "Microcontroller seated properly in socket U1. Orientation notch faces upward.",
    "detected_anomalies": [],
    "suggested_action": "Proceed to position decoupling capacitor C1."
  },
  "active_step": {
    "step_number": 1,
    "status": "verified"
  }
}
```

## Error Handling & Disconnection
- `WebSocketDisconnect`: Handled cleanly with an informational log.
- `Exception`: Logs error details and closes the connection to prevent orphaned background tasks.

## Cross-References
- Data structures: [docs/04-configuration/data-schemas.md](../04-configuration/data-schemas.md).
- Client receiver: [frontend-hud.md](./frontend-hud.md).
