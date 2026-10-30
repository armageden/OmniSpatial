**Back:** [00-overview](./00-overview.md)

# Reasoning Engine (`reasoning_engine.py`)

## File Location
`backend/app/services/reasoning_engine.py`

## Overview
The `ReasoningEngine` acts as the procedural state machine for physical tasks. It evaluates detected components against step criteria and advances task steps upon successful verification.

## Default Task Steps (`DEFAULT_STEPS`)
The engine is preconfigured with a 3-step electronics assembly workflow:
1. **Step 1:** "Mount Main IC Chip" (`microcontroller_chip`)
2. **Step 2:** "Position Decoupling Capacitor C1" (`decoupling_capacitor_c1`)
3. **Step 3:** "Solder Header Pins" (`uart_header`)

## Class: `ReasoningEngine`

### State Properties
- `self.steps`: List of `TaskStep` models.
- `self.current_step_idx`: Integer pointing to the currently active step.
- `self.last_verification`: Most recent `VerificationResult` cached for stream frames.

### Core Methods

#### 1. `get_active_step() -> TaskStep`
Returns the `TaskStep` at `self.current_step_idx`.

#### 2. `advance_step() -> TaskStep`
Advances active step to next in sequence, setting prior step to `"verified"`.

#### 3. `previous_step() -> TaskStep`
Navigates back to the preceding task step.

#### 4. `reset_workflow() -> TaskStep`
Resets all steps and returns active pointer to Step 1.

#### 5. `set_step(step_number: int) -> TaskStep`
Jumps directly to a specific 1-indexed step.

#### 6. `verify_step(segments: List[SegmentedObject], spatial_relations: Dict[str, Any], auto_advance: bool = False) -> VerificationResult`
- Assembles a structured prompt containing the active step's criteria, detected segments, and spatial relationships.
- Calls `meta_client.reason_physical_state_muse_spark(prompt, context)`.
- If `step_verified == True` and confidence >= 0.85:
  - Sets `active_step.status = "verified"`.
  - If `auto_advance == True` and not at final step, increments `self.current_step_idx`.
- If `step_verified == False`:
  - Sets `active_step.status = "failed"`.
- Caches and returns `VerificationResult`.

### Singleton Export
Exports `reasoning_engine = ReasoningEngine()` for use in `backend/app/main.py`.

## Cross-References
- How-to recipe for steps: [docs/00-how-to/add-verification-step.md](../00-how-to/add-verification-step.md).
- Data schemas: [docs/04-configuration/data-schemas.md](../04-configuration/data-schemas.md).
