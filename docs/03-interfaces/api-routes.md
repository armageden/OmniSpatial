**Back:** [00-overview](./00-overview.md)

# API Routes (`main.py`)

## File Location
`backend/app/main.py`

## Application Configuration
- **Instance:** `app = FastAPI(title=settings.app_name, debug=settings.debug)`
- **Middleware:** `CORSMiddleware` configured with wildcard allowances (`allow_origins=["*"]`) for local frontend development.

## Endpoints

### 1. Health Check
- **Route:** `GET /health`
- **Handler:** `async def health_check()`
- **Response Format:**
  ```json
  {
    "status": "online",
    "app": "OmniSpatial API",
    "mock_mode": true
  }
  ```
- **Use Case:** Sanity checks, container liveness probes, and verifying whether `meta_client` is running in mock mode.

### 2. Task Steps Catalog & Navigation
- **Route:** `GET /api/steps`
- **Handler:** `async def get_steps()`
- **Use Case:** Initial client bootstrapping and procedural roadmap visualization.

#### Step Navigation Routes:
- `POST /api/steps/next`: Advances active task step and sets prior step to `verified`.
- `POST /api/steps/prev`: Navigates to previous assembly step.
- `POST /api/steps/reset`: Resets full procedure to Step 1.
- `POST /api/steps/set/{step_number}`: Jumps directly to specified step.

### 3. Synthesized Visual Target Blueprint
- **Route:** `GET /api/steps/{step_number}/target-image`
- **Handler:** `async def get_target_image(step_number: int)`
- **Response Format:**
  ```json
  {
    "step_number": 1,
    "image_data_url": "data:image/svg+xml;utf8,...",
    "source": "muse_image_1.0",
    "is_cached": true
  }
  ```
- **Use Case:** Provides perspective engineering blueprint for sidebar preview and AR holographic canvas projection.

## Cross-References
- Streaming endpoint: [websocket-protocol.md](./websocket-protocol.md).
- Configuration settings: [docs/04-configuration/environment-variables.md](../04-configuration/environment-variables.md).
