**Back:** [00-overview](./00-overview.md)

# Runbook: Recording the Winning 3-Minute Demo Video & Devpost Submission

## 1. Goal
This runbook provides the exact, timestamped recording script, visual staging directions, and copy-paste-ready Devpost submission package to present OmniSpatial to Meta Hackathon judges with maximum competitive impact.

---

## 2. 3-Minute Video Production Runbook

### Audio/Video Setup:
- **Resolution:** 1080p (1920x1080) at 60 FPS.
- **Audio:** Crisp microphone with zero background noise.
- **Tool:** OBS Studio, Loom, or Camtasia.
- **Staging:** Open browser to `http://localhost:3000` with the backend running on `localhost:8000`.

### Timestamped Script & Screen Directions:

| Timestamp | Visual Screen Action | Spoken Voiceover Script |
| :--- | :--- | :--- |
| **0:00 – 0:25** | Split screen or direct camera view of OmniSpatial HUD in `demo_esp32` mode. Polygons track parts smoothly. | *"Foundation models have transformed text, images, and code. But the physical world—where humans solder circuits, inspect components, and assemble devices—remains untouched. Meet OmniSpatial: a real-time zero-shot physical AI copilot powered by Meta's SAM 3.1, Muse Spark, and Muse Image foundation models."* |
| **0:25 – 0:55** | Focus on HUD Canvas. Point out the glowing polygons, centroid dots, and the dynamic `MOVE ↗ 38px` trajectory arrow. | *"Unlike traditional computer vision that requires training custom object detectors, OmniSpatial uses SAM 3.1 for zero-shot Promptable Concept Segmentation. Our dual-loop streaming engine decouples high-rate 5 FPS visual tracking from reasoning, maintaining sub-200ms latency without video buffer lag."* |
| **0:55 – 1:25** | In top toolbar, switch to **Live Webcam** and type `coffee mug, pen, smartphone` into the SAM 3.1 Prompt input. | *"Notice how truly zero-shot this is: we can point our live camera at an everyday desk, type 'coffee mug, pen, smartphone', and SAM 3.1 immediately segments and labels real-world objects in live video with zero prior fine-tuning."* |
| **1:25 – 1:55** | Switch back to ESP32 demo. Click **"Project Blueprint onto Live HUD"** (Ghost Blueprint). | *"Technicians often struggle to visualize exact pin orientations. With Muse Image 1.0, OmniSpatial generates perspective-accurate visual targets, projecting a 35% alpha holographic blueprint directly over the workspace so operators can physically match parts to the blueprint."* |
| **1:55 – 2:30** | Press **Spacebar** or click **Verify Step**. Watch the box turn blue (*Analyzing...*), then green (*Verified 96%*), with the audio chime playing. | *"Once the component is placed, the operator presses Spacebar. Muse Spark 1.3 performs chain-of-thought physical reasoning in the background, analyzing millimeter clearances and orientation notch alignment without interrupting video streaming. The HUD rings a confirmation chime and validates the step."* |
| **2:30 – 3:00** | Show `README.md` architecture diagram and `make check` test suite passing 8/8 tests. | *"OmniSpatial is built with FastAPI, WebSockets, HTML5 Canvas, and tested end-to-end on the Meta Model API. It brings physical AI into precision manufacturing, robotics, and augmented reality glasses. Thank you!"* |

---

## 3. Devpost Submission Package

### Project Title
**OmniSpatial: Real-Time Zero-Shot Physical AI Copilot**

### Elevator Pitch (Tagline)
*Bridging Meta's SAM 3.1, Muse Spark, and Muse Image into an interactive real-time AR HUD that visually guides hands-on physical assembly, inspection, and repair.*

### Inspiration
Human physical work—from electronics prototyping and aerospace maintenance to medical devices and laboratory experiments—relies on manual dexterity. Yet existing computer vision systems are brittle: they require thousands of labeled training images for every unique circuit board or bolt, and they cannot reason about physical orientation, polarity, or procedural correctness. We wanted to build a true *embodied AI copilot* that observes physical tasks in real time and provides zero-shot visual guidance through augmented reality.

### What It Does
1. **Zero-Shot Spatial Perception (SAM 3.1)**: Segments micro-components, IC sockets, pin headers, and hand tools on-the-fly via promptable concept segmentation, generating smoothed contours with sub-200ms latency.
2. **Physical State Reasoning (Muse Spark 1.3)**: Ingests spatial distance vectors, centroid bearings, and assembly criteria to verify step completion, flagging misalignments or inverted polarity.
3. **Perspective Blueprint Projection (Muse Image 1.0)**: Projects perspective-accurate holographic target overlays directly onto the video feed, allowing operators to visually match physical components to the blueprint.
4. **Dual-Loop Streaming Engine**: Solves the fundamental latency bottleneck of multimodal LLMs by running high-rate spatial tracking at 5 FPS while dispatching physical reasoning asynchronously in the background.

### How We Built It
- **Backend:** FastAPI, Python 3.12, WebSockets, NumPy, OpenCV, and Pydantic V2.
- **Frontend HUD:** HTML5 Canvas, Vanilla JavaScript, Web Audio API chime synthesis, Tailwind CSS.
- **Meta Foundation Models:** SAM 3.1 (`/v1/responses`), Muse Spark 1.3 (`/v1/chat/completions`), Muse Image 1.0 (`/v1/responses`).
- **Cloud Infrastructure:** Modal serverless GPU containers for accelerated frame processing.

### Accomplishments We're Proud Of
- Designing a dual-loop streaming pipeline that completely eliminated a 5.8-second blocking bottleneck, achieving smooth 5 FPS AR tracking with sub-200ms latency.
- Developing client-side backpressure that prevents WebSocket queue buildup and frame desynchronization.
- Building a zero-dependency judge evaluation demo mode that allows anyone to evaluate the system with one click even without hardware.
- Establishing an automated test suite verifying spatial geometry, polygon simplification, Shoelace area, and state machine transitions.

---

## 4. Cross-References
- System architecture: [docs/01-architecture/system-topology.md](../01-architecture/system-topology.md)
- Streaming protocol: [docs/03-interfaces/websocket-protocol.md](../03-interfaces/websocket-protocol.md)
