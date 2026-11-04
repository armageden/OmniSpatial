import time
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional

class Point(BaseModel):
    x: float
    y: float

class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float

class SegmentedObject(BaseModel):
    id: str
    label: str
    confidence: float
    bbox: BoundingBox
    polygon: List[Point] = Field(default_factory=list)
    attributes: Dict[str, Any] = Field(default_factory=dict)
    area: Optional[float] = None
    centroid: Optional[Point] = None
    is_normalized: bool = False

class TaskStep(BaseModel):
    step_number: int
    title: str
    description: str
    target_components: List[str]
    verification_criteria: str
    status: str = "pending" # pending | in_progress | verified | failed

class VerificationResult(BaseModel):
    step_number: int
    is_verified: bool
    confidence: float
    feedback: str
    detected_anomalies: List[str] = Field(default_factory=list)
    suggested_action: Optional[str] = None

class FrameAnalysisPayload(BaseModel):
    frame_id: int = 0
    timestamp: float = Field(default_factory=time.time)
    image_base64: str
    active_step: int = 1
    width: Optional[int] = None
    height: Optional[int] = None
    normalize: bool = False
    smooth: bool = True
    action: Optional[str] = None
    trigger_verify: bool = False
    custom_prompt: Optional[str] = None
    allow_fallback: bool = False
    feed_mode: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

class StreamActionRequest(BaseModel):
    action: str # verify_step | next_step | prev_step | reset_workflow | set_step | set_workflow
    step_number: Optional[int] = None
    task_goal: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

class TargetImageResponse(BaseModel):
    step_number: int
    image_data_url: str
    source: str = "muse_image_1.0"
    is_cached: bool = False
