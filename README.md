# OmniSpatial 👁️⚡

> **Real-Time Zero-Shot Physical AI Copilot for Precision Hands-On Tasks**  
> *Built for the Meta Global AI Developer Hackathon (Oct 26 – Nov 4, 2026) | Indie Developer Track*

---

### 🎥 Demonstration Video
[![OmniSpatial Demo Video](https://img.youtube.com/vi/RIQpXqRXlCE/maxresdefault.jpg)](https://youtu.be/RIQpXqRXlCE)  
▶️ **[Watch the Live Application Walkthrough on YouTube](https://youtu.be/RIQpXqRXlCE)** *(1080p Full HD • Narrated Feature Walkthrough • Real Hardware Anomaly Detection)*

---

## 🌟 Overview

**OmniSpatial** bridges Meta's newest foundation models with human physical dexterity. By observing a live overhead video feed (webcam, smartphone, or wearable camera), OmniSpatial transforms dynamic physical tasks—such as electronics assembly, PCB inspection, laboratory procedures, or mechanical repair—into an interactive augmented reality experience:

1. **Zero-Shot Spatial Perception (SAM 3.1 via Meta Model API)**: Segments parts, pins, components, and tools on-the-fly without requiring custom-trained object detection models.
2. **Physical State Reasoning (Muse Spark Series)**: Ingests segmented mask topologies, component positions, and task instructions to verify step completion and detect misalignments or polarity errors.
3. **Photorealistic Visual Target Synthesis (Muse Image)**: Generates perspective-accurate previews of how the next step or corrected state should look directly from the user's viewing angle.
4. **Streaming Infrastructure (FastAPI WebSockets)**: Low-latency bidirectional streaming; Modal serverless GPUs are an optional offload/deployment (see `backend/app/services/modal_app.py`), not on the critical path.

---

## 📐 System Architecture

```mermaid
flowchart LR
    subgraph Client["Frontend HUD (HTML5 Canvas)"]
        A[Webcam / Mobile Video Stream] --> B[Frame Capture & Downsample]
        B --> C[WebSocket Client]
        D[Interactive Mask & HUD Overlay] <-- C
    end

    subgraph Backend["Backend & Inference (FastAPI / Modal)"]
        C --> E[WebSocket Ingestion Hub]
        E --> F[SAM 3.1 Segmentation Service]
        F --> G[Mask & Contour Extraction]
        G --> H[Muse Spark Physical Reasoning Engine]
        H --> I[Muse Image Target Synthesizer]
        H --> J[Guidance & Verification Events]
        J --> C
        I --> C
    end

    subgraph MetaAPI["Meta Model API & Open Weights"]
        F -.-> K[SAM 3.1 API]
        H -.-> L[Muse Spark Model API]
        I -.-> M[Muse Image API]
    end
```

---

## 🚀 Repository Structure

```
meta-hackathon/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI WebSocket streaming entrypoint
│   │   ├── config.py               # Environment configuration
│   │   ├── services/
│   │   │   ├── meta_client.py      # Meta Model API integration (SAM 3.1, Muse Spark, Muse Image)
│   │   │   ├── sam_service.py      # Zero-shot segmentation & polygon contour extraction
│   │   │   ├── reasoning_engine.py # Muse Spark state machine & verification loop
│   │   │   └── modal_app.py        # Modal serverless GPU runner
│   │   └── schemas/
│   │       └── models.py           # Pydantic data schemas
│   ├── requirements.txt
│   └── .env.example
├── frontend/                       # Interactive HUD with HTML5 Canvas mask overlays
├── docs/
│   ├── ARCHITECTURE.md             # In-depth architectural blueprint
│   └── ROADMAP_10_DAYS.md          # 10-day execution milestone plan (Oct 26 - Nov 4)
└── README.md
```

---

## ⏱️ Quickstart

### 1. Prerequisites
- Python 3.10+
- Meta Model API Key (`META_MODEL_API_KEY`) or Baseten / Fireworks partner keys (optional; runs in self-contained mock evaluation mode out-of-the-box)
- Modal Token (optional for serverless GPU worker deployment)

### 2. Fast Setup (Make)
```bash
make setup
make dev-backend
# In another terminal:
make dev-frontend
```

### 3. Manual Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
# Edit backend/.env if you have live META_MODEL_API_KEY, BASETEN_API_KEY, or FIREWORKS_API_KEY

# Launch Backend:
PYTHONPATH=backend uvicorn app.main:app --app-dir backend --reload --port 8000

# Launch Frontend:
python3 -m http.server 3000 --directory frontend
```
Then navigate to `http://localhost:3000` in your browser.

---

## 🎮 Hackathon Judge Demo Mode

No circuit board or soldering iron on hand? OmniSpatial includes an integrated **Judge Evaluation Mode**:
1. Open the HUD at `http://localhost:3000`.
2. In the top bar, select **Input Source: Demo: ESP32 Assembly** or **Demo: Solder Header**.
3. Watch the system perform real-time SAM 3.1 zero-shot segmentation, spatial distance vector tracking, and dynamic HUD overlays.
4. Press **Spacebar** or click **Verify Step** to trigger asynchronous physical reasoning via Muse Spark.
5. Click **Toggle Holographic Ghost** to project the perspective-accurate end state preview synthesized by Muse Image.
