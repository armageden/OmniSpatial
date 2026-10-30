**Back:** [00-overview](./00-overview.md)

# How-To: Deploy Modal Serverless GPU Worker

## 1. Goal
Use this recipe to test and deploy OmniSpatial's serverless GPU worker onto Modal infrastructure (`backend/app/services/modal_app.py`) using the hackathon partner GPU credits.

---

## 2. Step-by-Step Procedure

### Step 1: Install Modal CLI
Ensure the Modal CLI is installed:
```bash
pip install "modal>=0.62.0"
```

### Step 2: Authenticate Modal Account
Link your Modal account:
```bash
modal setup
```
Or export your API tokens in `backend/.env`:
```bash
export MODAL_TOKEN_ID="your_token_id"
export MODAL_TOKEN_SECRET="your_token_secret"
```

### Step 3: Test Function Execution Interactively
Run the app in ephemeral execution mode to verify GPU provisioning without a persistent deployment:
```bash
modal run backend/app/services/modal_app.py
```

### Step 4: Deploy Persistent Endpoints
Deploy the app to Modal's cloud:
```bash
modal deploy backend/app/services/modal_app.py
```

Modal will output the live public URL for the health web endpoint:
```text
✓ Created objects.
├── 🔨 Created process_frame_gpu
└── 🌐 Created health => https://<workspace>--omnispatial-meta-hackathon-health.modal.run
```

---

## 3. Real Code Pattern

In `backend/app/services/modal_app.py`:
```python
import modal

app = modal.App("omnispatial-meta-hackathon")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "fastapi",
        "uvicorn",
        "numpy",
        "pillow",
        "opencv-python-headless",
        "httpx"
    )
)

@app.function(image=image, gpu="T4", timeout=60, scaledown_window=120)
def process_frame_gpu(image_bytes: bytes) -> dict:
    return {"status": "success", "device": "cuda", "mask_count": 2}
```

---

## 4. Verification

Test the deployed web endpoint using curl:
```bash
curl -s https://<workspace>--omnispatial-meta-hackathon-health.modal.run
```
Expected output:
```json
{"status":"ok","provider":"Modal","service":"OmniSpatial"}
```

---

## 5. Deep-Dive Links
- Reference Documentation: [docs/02-services/modal-worker.md](../02-services/modal-worker.md)
- Configuration: [docs/04-configuration/environment-variables.md](../04-configuration/environment-variables.md)
