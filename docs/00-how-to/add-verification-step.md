**Back:** [00-overview](./00-overview.md)

# How-To: Add a Task Verification Step

## 1. Goal
Use this recipe when adding a new physical assembly step, inspection criterion, or verification milestone to OmniSpatial's procedural state machine.

---

## 2. Step-by-Step Procedure

1. Open `backend/app/services/reasoning_engine.py`.
2. Locate the `DEFAULT_STEPS` array.
3. Append a new `TaskStep` object with the next sequential `step_number`.
4. Define the target components that SAM 3.1 must detect.
5. Specify unambiguous `verification_criteria` for Muse Spark to evaluate.
6. Verify syntax and test the updated endpoint.

---

## 3. Real Code Pattern

In `backend/app/services/reasoning_engine.py`:
```python
from app.schemas.models import TaskStep

# Append your new step to DEFAULT_STEPS:
TaskStep(
    step_number=4,
    title="Attach Heatsink",
    description="Affix aluminum heatsink over the main MCU package using thermal adhesive.",
    target_components=["heatsink", "thermal_pad"],
    verification_criteria="heatsink centered over microcontroller_chip with thermal_pad interface",
    status="pending"
)
```

If updating the frontend simulation cycle, update `simStepBtn` listener in `frontend/app.js`:
```javascript
// Inside simStepBtn event listener in frontend/app.js
stepCounter = (stepCounter % 4) + 1; // Updated to 4 steps
```

---

## 4. Verification

Compile check:
```bash
python3 -m py_compile backend/app/services/reasoning_engine.py
```

Run test server and query the API:
```bash
# Start backend in a terminal
cd backend && uvicorn app.main:app --port 8000
# In another terminal:
curl -s http://localhost:8000/api/steps | python3 -m json.tool
```

Confirm that the new step appears in the returned JSON array.

---

## 5. Deep-Dive Links
- Reference Documentation: [docs/02-services/reasoning-engine.md](../02-services/reasoning-engine.md)
- Data Schemas: [docs/04-configuration/data-schemas.md](../04-configuration/data-schemas.md)
