**Back:** [00-overview](./00-overview.md)

# How-To: Add a Meta Model API Endpoint

## 1. Goal
Use this recipe when integrating a new capability from Meta's Model API (e.g., depth estimation, audio synthesis, or alternative vision models) into `MetaModelAPIClient`.

---

## 2. Step-by-Step Procedure

1. Open `backend/app/services/meta_client.py`.
2. Define a new asynchronous method on `MetaModelAPIClient`.
3. Add a mock fallback branch (`if self.is_mock:`) returning deterministic test data.
4. Add the live HTTP call using `httpx.AsyncClient(timeout=...)` pointing to `self.base_url`.
5. Add authorization headers: `{"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}`.
6. Handle exceptions with `response.raise_for_status()`.

---

## 3. Real Code Pattern

In `backend/app/services/meta_client.py`:
```python
import httpx
from typing import Dict, Any

class MetaModelAPIClient:
    # ... existing methods ...

    async def estimate_depth_meta(self, image_base64: str) -> Dict[str, Any]:
        """Call Meta depth estimation model with mock fallback."""
        if self.is_mock:
            return {
                "status": "success",
                "estimated_distance_mm": 125.0,
                "confidence": 0.91
            }

        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "meta/depth-anything-v2",
                "image": image_base64
            }
            response = await client.post(
                f"{self.base_url}/vision/depth",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            return response.json()
```

---

## 4. Verification

Compile check:
```bash
python3 -m py_compile backend/app/services/meta_client.py
```

Run end-to-end Meta Model API verification script:
```bash
python3 scripts/test_meta_api.py
```

Test method execution in Python interactive shell:
```bash
python3 -c "import asyncio; from backend.app.services.meta_client import meta_client; res = asyncio.run(meta_client.estimate_depth_meta('test')); print(res)"
```

---

## 5. Deep-Dive Links
- Reference Documentation: [docs/02-services/meta-client.md](../02-services/meta-client.md)
- Configuration: [docs/04-configuration/environment-variables.md](../04-configuration/environment-variables.md)
