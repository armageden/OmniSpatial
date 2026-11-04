**Back:** [00-overview](./00-overview.md)

# Meta Client (`meta_client.py`)

## File Location
`backend/app/services/meta_client.py`

## Class: `MetaModelAPIClient`
Encapsulates all outbound calls to Meta's Model API and provides an integrated mock fallback mode when valid API credentials are not supplied.

### Instantiation & Configuration
- Reads `settings.meta_model_api_key` and `settings.meta_api_base_url` from `backend/app/config.py`.
- **Partner Model Provider Routing:** Supports Baseten (`baseten_api_key`, routing to `https://bridge.baseten.co/v1` with `Api-Key` headers) and Fireworks AI (`fireworks_api_key`, routing to `https://api.fireworks.ai/inference/v1` with `Bearer` headers) for partner prize track compliance.
- Evaluates `self.is_mock`: Set to `True` if no valid Meta, Baseten, or Fireworks API keys are supplied.
- Exports a module-level singleton: `meta_client = MetaModelAPIClient()`.
- End-to-end connectivity can be verified using `scripts/test_meta_api.py`.

### Core Methods

#### 1. `segment_frame_sam(image_base64: str, target_label: str = "...", target_components: Optional[List[str]] = None, allow_fallback: bool = False, force_mock: bool = False) -> List[SegmentedObject]`
- **Target Model:** `sam-3.1` via `POST {base_url}/responses`.
- **Purpose:** Extracts zero-shot segmentation contours, bounding boxes, and component labels from base64 image strings.
- **Mask Decoding:** Matches `<|box;...|>` and `<|mask;x=0;y=0;data=H,W,PAYLOAD|>` where `PAYLOAD` starts with `~` (lossless) or `!` (one_bit), extracting entity label prefixes directly from SAM 3.1 text output before falling back to `target_components`. Decodes via the official `meta-sam-parser` (`decode_mask_to_raster`) into a binary raster, then `cv2.findContours` to extract real pixel boundary vertices; falls back to the 8-point `_fallback_octagon_polygon` only if decoding fails or the contour is too small. The legacy `decode_rle_mask` (pycocotools COCO RLE) is retained for backward compatibility with synthetic tests.
- **Mock Behavior:** Dynamically extracts component bounding boxes and contours from demo frames using OpenCV color-mask segmentation when `image_base64` is a valid frame, or returns simulated electronics components (`microcontroller_chip` and `socket_u1`) when `is_mock=True` or `allow_fallback=True`.

#### 2. `decode_rle_mask(mask_str: str, bbox: BoundingBox, offset_x: Optional[float] = None, offset_y: Optional[float] = None) -> List[Point]`
- **Purpose:** Decodes SAM 3.1 Run-Length Encoded (RLE) strings (`"H,W,COUNTS"`) into a list of Point polygon vertices aligned with full image pixel coordinates, using `offset_x` and `offset_y` when provided.

#### 3. `is_target_image_cached(step_number: int, prompt: str = "") -> bool`
- **Purpose:** Fast boolean check verifying whether the synthesized target blueprint for `step_number` and optional prompt hash is already cached in memory.

#### 4. `reason_physical_state_muse_spark(prompt: str, context: Dict[str, Any], image_base64: str = "") -> Dict[str, Any]`
- **Target Model:** `muse-spark-1.3` via `POST {base_url}/chat/completions`.
- **Purpose:** Executes multimodal chain-of-thought verification on live camera frames (`image_base64`) and spatial topologies, comparing detected physical components against step criteria.
- **Returns:** Dictionary containing `step_verified` (bool), `confidence` (float), `reasoning` (str), `anomalies` (list), and `next_action` (str).

#### 5. `generate_task_steps_muse_spark(task_goal: str) -> List[Dict[str, Any]]`
- **Target Model:** `muse-spark-1.3` via `POST {base_url}/chat/completions`.
- **Purpose:** Synthesizes a dynamic 3-step physical procedure (`title`, `description`, `target_components`, `verification_criteria`) for arbitrary user task goals.

#### 6. `generate_target_image_muse(prompt: str, step_number: int = 1, reference_image_base64: str = "") -> str`
- **Target Model:** `muse-image-1.0` via `POST {base_url}/responses`.
- **Purpose:** Generates a perspective-aligned visual preview demonstrating the expected physical appearance of the next step.
- **Caching & Fallback:** Caches live generated images dynamically with FIFO bounding to 50 items. Seamlessly falls back to transparent pre-rendered blueprint SVGs (`DEFAULT_TARGET_SVGS` in 640x400 coordinates) or dynamically synthesizes custom schematic SVG blueprints via `_generate_dynamic_mock_blueprint` when handling arbitrary user prompts offline.

#### 7. `get_http_client(timeout: float = 30.0) -> httpx.AsyncClient`
- **Purpose:** Reusable persistent `httpx.AsyncClient` instance maintaining keep-alive connection pools across high-frequency streaming requests.

#### 8. `close() -> None`
- **Purpose:** Async teardown method that closes the shared `httpx.AsyncClient` and releases open connection pools, called during FastAPI lifespan shutdown.

## Cross-References
- Service consumers: [sam-service.md](./sam-service.md) and [reasoning-engine.md](./reasoning-engine.md).
- Configuration keys: [docs/04-configuration/environment-variables.md](../04-configuration/environment-variables.md).
