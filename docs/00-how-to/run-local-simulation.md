**Back:** [00-overview](./00-overview.md)

# How-To: Run Local Simulation Mode

## 1. Goal
Use this recipe to test and run the full OmniSpatial system locally without live Meta Model API keys or GPU hardware. The backend automatically activates high-fidelity mock generators for SAM 3.1 and Muse Spark.

---

## 2. Step-by-Step Procedure

### Step 1: Install Backend Dependencies
Ensure Python 3.10+ is available:
```bash
pip install -r backend/requirements.txt
```

### Step 2: Start the FastAPI Backend
From the repository root:
```bash
PYTHONPATH=backend uvicorn app.main:app --app-dir backend --reload --port 8000
```
Or from the `backend/` directory:
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Step 3: Verify Mock Mode Status
Open a terminal and run:
```bash
curl -s http://localhost:8000/health
```
Verify the output confirms `"mock_mode": true`:
```json
{"status":"online","app":"OmniSpatial API","mock_mode":true}
```

### Step 4: Launch the Frontend HUD
Serve `frontend/` using Python's static HTTP server:
```bash
python3 -m http.server 3000 --directory frontend
```
Open `http://localhost:3000` in your web browser.

### Step 5: Test HUD Interactions
1. If no webcam is attached or permission is denied, observe the automatic fallback to synthetic circuit board canvas rendering.
2. Click **Start Camera** to initialize stream capture and connect to `ws://localhost:8000/ws/stream`.
3. Click **Simulate Next Assembly Step** to cycle through assembly tasks.

---

## 3. Verification

Confirm WebSocket connection in the browser developer console:
```text
Connected to backend stream WebSocket
```

Verify backend console logs show incoming stream traffic:
```text
INFO:omnispatial:Client connected to OmniSpatial real-time stream.
```

---

## 4. Deep-Dive Links
- Reference Documentation: [docs/03-interfaces/frontend-hud.md](../03-interfaces/frontend-hud.md)
- WebSocket Specifications: [docs/03-interfaces/websocket-protocol.md](../03-interfaces/websocket-protocol.md)
