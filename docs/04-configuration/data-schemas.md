**Back:** [00-overview](./00-overview.md)

# Data Schemas (`models.py`)

## File Location
`backend/app/schemas/models.py`

## Schema Definitions

### 1. `Point`
Represents a 2D Cartesian coordinate in pixel or normalized space:
- `x` (`float`): Horizontal position.
- `y` (`float`): Vertical position.

### 2. `BoundingBox`
Axis-aligned rectangular bounding box:
- `x_min` (`float`): Leftmost pixel or normalized coordinate.
- `y_min` (`float`): Topmost pixel or normalized coordinate.
- `x_max` (`float`): Rightmost pixel or normalized coordinate.
- `y_max` (`float`): Bottommost pixel or normalized coordinate.

### 3. `SegmentedObject`
Zero-shot segmentation entity returned by SAM 3.1:
- `id` (`str`): Unique entity identifier within the frame.
- `label` (`str`): Inferred or classified component name.
- `confidence` (`float`): Detection score (0.0 to 1.0).
- `bbox` (`BoundingBox`): Bounding box container.
- `polygon` (`List[Point]`): Closed contour vertex list.
- `attributes` (`Dict[str, Any]`): Arbitrary detected features (e.g., orientation angle, pin detection).
- `area` (`Optional[float]`): Surface area of the segmented polygon in square units.
- `centroid` (`Optional[Point]`): Center of mass coordinate of the segmented polygon.
- `is_normalized` (`bool`): Flag indicating whether coordinates are in normalized `[0.0, 1.0]` space (default `False`).

### 4. `TaskStep`
Procedural milestone definition for human-in-the-loop task execution:
- `step_number` (`int`): Sequential index.
- `title` (`str`): Human-readable milestone headline.
- `description` (`str`): Detailed instructional guidance.
- `target_components` (`List[str]`): Required component labels.
- `verification_criteria` (`str`): Condition required for validation.
- `status` (`str`): One of `"pending"`, `"in_progress"`, `"verified"`, or `"failed"`.

### 5. `VerificationResult`
Outcome produced by `ReasoningEngine` and Muse Spark:
- `step_number` (`int`): Step evaluated.
- `is_verified` (`bool`): Whether physical condition passed.
- `confidence` (`float`): Model evaluation confidence.
- `feedback` (`str`): Explanation of reasoning.
- `detected_anomalies` (`List[str]`): Discrepancies observed.
- `suggested_action` (`Optional[str]`): Recommended next action.

### 6. `FrameAnalysisPayload`
Inbound stream data container sent from client over WebSocket:
- `frame_id` (`int`): Frame sequence number (default `0`).
- `timestamp` (`float`): Client capture epoch timestamp (default factory `time.time`).
- `image_base64` (`str`): Base64 encoded JPEG or PNG image.
- `active_step` (`int`): Current step being worked on (default `1`).
- `width` (`Optional[int]`): Video capture width in pixels.
- `height` (`Optional[int]`): Video capture height in pixels.
- `normalize` (`bool`): Whether to request normalized coordinates (default `False`).
- `smooth` (`bool`): Whether to apply Douglas-Peucker & Chaikin smoothing (default `True`).
- `action` (`Optional[str]`): Control action string (e.g. `"verify_step"`, `"next_step"`).
- `trigger_verify` (`bool`): Boolean flag triggering asynchronous Muse Spark evaluation.
- `custom_prompt` (`Optional[str]`): Open-vocabulary concept segmentation prompt overriding milestone defaults.
- `allow_fallback` (`bool`): Boolean allowing graceful mock fallback on network degradation (default `False`).
- `feed_mode` (`Optional[str]`): Input stream mode (e.g. `"camera"`, `"demo_esp32"`, `"demo_cap"`, `"demo_header"`).

### 7. `StreamActionRequest`
Explicit control payload sent via WebSocket:
- `action` (`str`): One of `"verify_step"`, `"next_step"`, `"prev_step"`, `"reset_workflow"`, `"set_step"`, `"set_workflow"`.
- `step_number` (`Optional[int]`): Optional step target index.
- `task_goal` (`Optional[str]`): Optional custom physical task goal for dynamic 3-step procedure synthesis.

### 8. `TargetImageResponse`
Response containing perspective synthesized blueprint from Muse Image:
- `step_number` (`int`): Corresponding task step.
- `image_data_url` (`str`): Base64 Data URL or SVG string.
- `source` (`str`): Originating generator (e.g. `"muse_image_1.0"`).
- `is_cached` (`bool`): Flag indicating cache hit.

## Cross-References
- Service usage: [docs/02-services/sam-service.md](../02-services/sam-service.md) and [docs/02-services/reasoning-engine.md](../02-services/reasoning-engine.md).
- API routes: [docs/03-interfaces/api-routes.md](../03-interfaces/api-routes.md).
