**Back:** [00-overview](./00-overview.md)

# Environment Variables

## Configuration File
Template: `backend/.env.example`  
Runtime Loader: `backend/app/config.py` using `pydantic_settings.BaseSettings`

## Supported Variables

| Variable | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `META_MODEL_API_KEY` | `str` | `"mock_key"` | API key for Meta Model API (SAM 3.1, Muse Spark, Muse Image). If set to `"mock_key"` or empty, client runs in offline mock mode. |
| `META_API_BASE_URL` | `str` | `"https://api.meta.ai/v1"` | Base HTTP endpoint for Meta Model API calls. |
| `MODAL_TOKEN_ID` | `str` | `""` | Modal authentication token ID for serverless GPU dispatch. |
| `MODAL_TOKEN_SECRET` | `str` | `""` | Modal authentication token secret. |
| `BASETEN_API_KEY` | `str` | `""` | API key for Baseten model inference partner credits. |
| `FIREWORKS_API_KEY` | `str` | `""` | API key for Fireworks model inference partner credits. |
| `DEBUG` | `bool` | `True` | Enables verbose FastAPI debugging and auto-reload logging. |
| `HOST` | `str` | `"0.0.0.0"` | Network host interface binding. |
| `PORT` | `int` | `8000` | Port on which FastAPI Uvicorn server listens. |

## Setting Up Locally
```bash
cp backend/.env.example backend/.env
# Edit backend/.env to supply real credentials when available
```

> [!CAUTION]
> **Billing Safety Guard:**
> Keep `META_MODEL_API_KEY="mock_key"` until you have verified that the granted `$150` credits appear under the **"Free Credits"** section of your **Billing** page at `dev.meta.ai`.
> If an API key is connected before the credits are granted in the batch distribution, Meta will bill your attached payment method directly. Always configure a **Spend Limit notification at \$150** on the Billing console.

## Cross-References
- Meta client consumption: [docs/02-services/meta-client.md](../02-services/meta-client.md).
- Modal configuration: [docs/02-services/modal-worker.md](../02-services/modal-worker.md).
