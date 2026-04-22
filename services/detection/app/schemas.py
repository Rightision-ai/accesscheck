"""Request / response schemas. Mirror the TS `DetectedValue<T>` and annotation shapes."""
from typing import Literal, Optional
from pydantic import BaseModel, Field


DetectionSource = Literal["yolo", "sam", "ocr", "llm", "user"]
ImageKind = Literal["floor_plan", "photo"]


class BBox(BaseModel):
    # Normalised to [0, 1000] on both axes to stay resolution-independent client-side.
    x: float
    y: float
    w: float
    h: float


class Annotation(BaseModel):
    object_class: str
    label: str
    value_text: Optional[str] = None
    bbox: BBox
    polygon: Optional[list[list[float]]] = None
    confidence: float = Field(ge=0.0, le=1.0)
    criterion_id: Optional[str] = None
    color: Optional[str] = None
    source: DetectionSource


class FieldValue(BaseModel):
    field: str
    value: float | int | str | bool | None
    unit: Optional[Literal["mm", "cm", "m", "deg", "percent"]] = None
    source: DetectionSource
    confidence: float = Field(ge=0.0, le=1.0)
    evidence_bbox: Optional[BBox] = None
    evidence_image_id: Optional[str] = None


class DetectRequest(BaseModel):
    image_url: Optional[str] = None
    image_b64: Optional[str] = None
    kind: ImageKind
    image_id: Optional[str] = None
    known_scale_px_per_mm: Optional[float] = None


class DetectResponse(BaseModel):
    kind: ImageKind
    image_id: Optional[str] = None
    scale_px_per_mm: Optional[float] = None
    scale_confidence: float = 0.0
    annotations: list[Annotation] = []
    fields: list[FieldValue] = []
    raw_ocr: list[dict] = []
    warnings: list[str] = []
