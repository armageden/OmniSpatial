**Back:** [00-overview](./00-overview.md)

# Meta Client (`meta_client.py`)

## File Location
`backend/app/services/meta_client.py`

## Class: `MetaModelAPIClient`
Encapsulates all outbound calls to Meta's Model API and provides an integrated mock fallback mode when valid API credentials are not supplied.

### Instantiation & Configuration
- Reads `settings.meta_model_api_key` and `settings.meta_api_base_url` from `backend/app/config.py`.
- Evaluates `self.is_mock`: Set to `True` if the API key is missing, empty, or equal to `"mock_key"` / `"your_meta_model_api_key_here"`.
- Exports a module-level singleton: `meta_client = MetaModelAPIClient()`.
- End-to-end connectivity can be verified using `scripts/test_meta_api.py`.

### Core Methods

#### 1. `segment_frame_sam(image_base64: str, target_label: str = "...", target_components: Optional[List[str]] = None, allow_fallback: bool = False) -> List[SegmentedObject]`
- **Target Model:** `sam-3.1` via `POST {base_url}/responses`.
- **Purpose:** Extracts zero-shot segmentation contours, bounding boxes, and component labels from base64 image strings.
- **RLE Mask Decoding:** Matches `<|box;...|>` and `<|mask;...;data=H,W,COUNT_STR|>`. Calls `decode_rle_mask` using `pycocotools.mask.decode` and `cv2.findContours` to extract real pixel boundary vertices, with an 8-point geometric polygon (`_fallback_octagon_polygon`) as a safety fallback if the mask is omitted.
- **Mock Behavior:** Returns simulated electronics components (`microcontroller_chip` and `decoupling_capacitor_c1`) with defined bounding boxes and polygon vertices when `is_mock=True` or `allow_fallback=True`.

#### 2. `decode_rle_mask(mask_str: str, bbox: BoundingBox, offset_x: Optional[float] = None, offset_y: Optional[float] = None) -> List[Point]`
- **Purpose:** Decodes SAM 3.1 Run-Length Encoded (RLE) strings (`"H,W,COUNTS"`) into a list of Point polygon vertices aligned with full image pixel coordinates, using `offset_x` and `offset_y` when provided.

#### 3. `is_target_image_cached(step_number: int) -> bool`
- **Purpose:** Fast boolean check verifying whether the synthesized target blueprint for `step_number` is already cached in memory.

#### 4. `reason_physical_state_muse_spark(prompt: str, context: Dict[str, Any]) -> Dict[str, Any]`
- **Target Model:** `muse-spark-1.3` via `POST {base_url}/chat/completions`.
- **Purpose:** Executes chain-of-thought verification on spatial topologies, comparing detected physical components against step criteria.
- **Returns:** Dictionary containing `step_verified` (bool), `confidence` (float), `reasoning` (str), `anomalies` (list), and `next_action` (str).

#### 5. `generate_target_image_muse(prompt: str, step_number: int = 1, reference_image_base64: str = "") -> str`
- **Target Model:** `muse-image-1.0` via `POST {base_url}/responses`.
- **Purpose:** Generates a perspective-aligned visual preview demonstrating the expected physical appearance of the next step.
- **Caching & Fallback:** Caches live generated images dynamically. Seamlessly falls back to pre-rendered blueprint SVGs (`DEFAULT_TARGET_SVGS`) when offline or on latency timeouts.

## Cross-References
- Service consumers: [sam-service.md](./sam-service.md) and [reasoning-engine.md](./reasoning-engine.md).
- Configuration keys: [docs/04-configuration/environment-variables.md](../04-configuration/environment-variables.md).
