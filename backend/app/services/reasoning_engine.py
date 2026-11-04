from typing import List, Dict, Any, Optional
from app.schemas.models import TaskStep, VerificationResult, SegmentedObject
from app.services.meta_client import meta_client

DEFAULT_STEPS = [
    TaskStep(
        step_number=1,
        title="Mount Main IC Chip",
        description="Place the microcontroller into socket U1, ensuring pin 1 notch faces upwards.",
        target_components=["microcontroller_chip", "socket_u1"],
        verification_criteria="microcontroller_chip centered in socket U1 with orientation notch at top",
        status="in_progress"
    ),
    TaskStep(
        step_number=2,
        title="Position Decoupling Capacitor C1",
        description="Insert 100nF ceramic capacitor into pads C1 next to VCC rail.",
        target_components=["decoupling_capacitor_c1", "pads_c1"],
        verification_criteria="decoupling_capacitor_c1 aligned on pads C1 within 10mm of microcontroller_chip VCC pin",
        status="pending"
    ),
    TaskStep(
        step_number=3,
        title="Solder Header Pins",
        description="Solder 4-pin UART communication header cleanly across pads J1.",
        target_components=["uart_header", "pads_j1"],
        verification_criteria="4 pins present across pads J1, no solder bridges between adjacent pads",
        status="pending"
    )
]

class ReasoningEngine:
    """Manages active task procedures, step navigation, and Muse Spark verification."""

    def __init__(self):
        self.steps: List[TaskStep] = [s.model_copy() for s in DEFAULT_STEPS]
        self.current_step_idx: int = 0
        self.last_verification: Optional[VerificationResult] = None

    def get_active_step(self) -> TaskStep:
        return self.steps[self.current_step_idx]

    def advance_step(self) -> TaskStep:
        """Advance to the next assembly step."""
        if self.current_step_idx + 1 < len(self.steps):
            # Only mark verified if not explicitly failed; manual navigation implies completion
            if self.steps[self.current_step_idx].status != "failed":
                self.steps[self.current_step_idx].status = "verified"
            self.current_step_idx += 1
            self.steps[self.current_step_idx].status = "in_progress"
            self.last_verification = None
        return self.get_active_step()

    def previous_step(self) -> TaskStep:
        """Navigate back to the prior step."""
        if self.current_step_idx > 0:
            self.steps[self.current_step_idx].status = "pending"
            self.current_step_idx -= 1
            self.steps[self.current_step_idx].status = "in_progress"
            self.last_verification = None
        return self.get_active_step()

    def set_step(self, step_number: int) -> TaskStep:
        """Jump to a specific step (1-indexed)."""
        idx = max(0, min(step_number - 1, len(self.steps) - 1))
        for i, s in enumerate(self.steps):
            if i < idx:
                s.status = "verified"
            elif i == idx:
                s.status = "in_progress"
            else:
                s.status = "pending"
        self.current_step_idx = idx
        self.last_verification = None
        return self.get_active_step()

    def reset_workflow(self) -> TaskStep:
        """Reset the full procedure back to step 1."""
        self.steps = [s.model_copy() for s in DEFAULT_STEPS]
        self.current_step_idx = 0
        self.steps[0].status = "in_progress"
        self.last_verification = None
        return self.get_active_step()

    async def load_custom_workflow(self, task_goal: str) -> TaskStep:
        """Generate and load a dynamic 3-step workflow for an arbitrary task goal."""
        raw_steps = await meta_client.generate_task_steps_muse_spark(task_goal)
        built: List[TaskStep] = []
        for idx, item in enumerate(raw_steps[:3]):
            built.append(
                TaskStep(
                    step_number=idx + 1,
                    title=str(item.get("title", f"Step {idx + 1}")),
                    description=str(item.get("description", task_goal)),
                    target_components=[str(c) for c in (item.get("target_components") or ["primary_part", "base_mount"])],
                    verification_criteria=str(item.get("verification_criteria", "Components aligned within tolerance")),
                    status="in_progress" if idx == 0 else "pending"
                )
            )
        if built:
            self.steps = built
            self.current_step_idx = 0
            self.last_verification = None
        return self.get_active_step()

    async def verify_step(
        self,
        segments: List[SegmentedObject],
        spatial_relations: Dict[str, Any],
        auto_advance: bool = False,
        image_base64: str = ""
    ) -> VerificationResult:
        active_step = self.get_active_step()

        prompt = (
            f"You are the OmniSpatial physical reasoning engine. Evaluate whether Step {active_step.step_number} "
            f"('{active_step.title}') is complete and correct.\n"
            f"Criteria: {active_step.verification_criteria}\n"
            f"Detected components: {[s.model_dump() for s in segments]}\n"
            f"Spatial relations: {spatial_relations}"
        )

        call_kwargs: Dict[str, Any] = {
            "prompt": prompt,
            "context": {"step": active_step.model_dump(), "spatial_relations": spatial_relations}
        }
        if image_base64:
            call_kwargs["image_base64"] = image_base64
        response = await meta_client.reason_physical_state_muse_spark(**call_kwargs)

        raw_verified = bool(response.get("step_verified", False))
        confidence = float(response.get("confidence", 0.95))
        is_verified = raw_verified and confidence >= 0.85

        if is_verified:
            active_step.status = "verified"
            if auto_advance and self.current_step_idx + 1 < len(self.steps):
                self.current_step_idx += 1
                self.steps[self.current_step_idx].status = "in_progress"
        else:
            active_step.status = "failed"

        result = VerificationResult(
            step_number=active_step.step_number,
            is_verified=is_verified,
            confidence=confidence,
            feedback=response.get("reasoning", "Physical alignment criteria evaluated."),
            detected_anomalies=response.get("anomalies", []),
            suggested_action=response.get("next_action")
        )
        self.last_verification = result
        return result

reasoning_engine = ReasoningEngine()
