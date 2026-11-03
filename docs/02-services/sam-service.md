**Back:** [00-overview](./00-overview.md)

# SAM Service (`sam_service.py`)

## File Location
`backend/app/services/sam_service.py`

## Class: `SAMService`
Responsible for processing raw video frames through SAM 3.1, transforming low-level segmentation geometries into spatial topology metrics, smoothing contours for AR HUD rendering, and normalizing coordinates.

### Core Methods

#### 1. `process_frame(image_base64: str, frame_width: Optional[int] = None, frame_height: Optional[int] = None, normalize: bool = False, smooth: bool = True, epsilon: float = 1.5, smoothing_iterations: int = 1, target_label: str = "electronic components, circuit board parts, chips, connectors", target_components: Optional[List[str]] = None, allow_fallback: bool = False) -> List[SegmentedObject]`
- Calls `meta_client.segment_frame_sam(image_base64, target_label, target_components, allow_fallback)`.
- Parses raw mask coordinates into clean vertex polygons via `parse_polygon`.
- Applies Douglas-Peucker polygon simplification with tolerance `epsilon` to strip high-frequency camera noise while preserving sharp corners.
- Applies Chaikin's corner-cutting algorithm with `smoothing_iterations` for smooth HUD canvas rendering.
- Calculates surface area via Shoelace formula and centroid coordinates.
- Optionally converts absolute pixel coordinates into normalized `[0.0, 1.0]` coordinate space when `normalize=True` and dimensions are provided.
- Returns an array of `SegmentedObject` instances.

#### 2. `compute_spatial_relationships(segments: List[SegmentedObject]) -> Dict[str, Any]`
- Calculates pairwise geometric metrics between all segmented objects in the frame:
  - **Center Distance (`distance_px`):** Euclidean distance between object centroids or bounding box centers.
  - **Offset Coordinates (`dx`, `dy`):** Horizontal and vertical axis displacement between centers.
  - **Intersection over Union (`iou`):** Bounding box intersection ratio over union area.
  - **Overlap Flag (`is_overlapping`):** Boolean indicating spatial collision or overlap.
  - **Relative Bearing (`relative_bearing_deg`):** Angular direction from entity A to entity B in degrees `[-180.0, 180.0]`.
  - **Component Labels (`labels`):** Tuple of entity labels `(seg_a.label, seg_b.label)`.

#### 3. Coordinate Normalization
- `normalize_coordinates(points: List[Point], width: float, height: float) -> List[Point]`: Converts pixel points to `[0.0, 1.0]` space.
- `denormalize_coordinates(points: List[Point], width: float, height: float) -> List[Point]`: Scales normalized points back to target pixel dimensions.
- `normalize_bbox(bbox: BoundingBox, width: float, height: float) -> BoundingBox`: Normalizes bounding box boundaries.
- `denormalize_bbox(bbox: BoundingBox, width: float, height: float) -> BoundingBox`: Denormalizes bounding box boundaries.

#### 4. Geometry & Contour Algorithms
- `simplify_polygon(points: List[Point], epsilon: float = 1.5) -> List[Point]`: Recursive Douglas-Peucker simplification using vector perpendicular distances, with input clamping for bounds safety.
- `smooth_polygon(points: List[Point], iterations: int = 1, closed: bool = True) -> List[Point]`: Chaikin's corner subdivision smoothing algorithm, with iterations bounded to `[0, 5]`.
- `parse_polygon(raw_polygon: Any) -> List[Point]`: Robust parser accepting `Point` models, dictionaries, coordinate tuples, or NumPy arrays.
- `trace_binary_mask(mask: np.ndarray, min_area: float = 20.0) -> List[Point]`: Boundary tracing algorithm for 2D binary segmentation masks powered by OpenCV contour detection.
- `calculate_polygon_area(points: List[Point]) -> float`: Shoelace formula surface area calculation.
- `calculate_centroid(points: List[Point], bbox: Optional[BoundingBox] = None) -> Point`: Centroid calculation with fallback to bounding box center.
- `compute_bounding_box(points: List[Point]) -> BoundingBox`: Computes tight axis-aligned bounding box from vertex extremes.

### Singleton Export
Exports `sam_service = SAMService()` for use in `backend/app/main.py`.

## Cross-References
- Data schemas: [docs/04-configuration/data-schemas.md](../04-configuration/data-schemas.md).
- Meta Client: [meta-client.md](./meta-client.md).
