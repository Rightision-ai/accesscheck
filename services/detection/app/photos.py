"""Photo fixture detection — grab rails, stair lifts, level-access showers, ramps, etc."""
from __future__ import annotations

import cv2
import numpy as np

from .classes import PHOTO_CLASSES, color_of
from .models import load_photo_model
from .schemas import Annotation, BBox, DetectResponse, FieldValue

FIXTURE_FIELD: dict[str, tuple[str, bool]] = {
    # class -> (field, value)
    "stairlift":           ("has_stair_lift", True),
    "through_floor_lift":  ("has_through_floor_lift", True),
    "level_access_shower": ("bathroom_has_level_access_shower", True),
    "handrail":            ("stair_70cm_clearance", True),
    "ramp":                ("has_property_ramp", True),
}


def _bbox_norm(xyxy: tuple[float, float, float, float], w: int, h: int) -> BBox:
    x1, y1, x2, y2 = xyxy
    return BBox(
        x=1000.0 * x1 / w,
        y=1000.0 * y1 / h,
        w=1000.0 * (x2 - x1) / w,
        h=1000.0 * (y2 - y1) / h,
    )


def detect_photo(
    image_bgr: np.ndarray,
    image_id: str | None = None,
) -> DetectResponse:
    h, w = image_bgr.shape[:2]
    model = load_photo_model()
    annotations: list[Annotation] = []
    fields: list[FieldValue] = []
    warnings: list[str] = []

    if model is None:
        warnings.append("photo_weights_missing — returning empty detections")
        return DetectResponse(
            kind="photo",
            image_id=image_id,
            annotations=annotations,
            fields=fields,
            warnings=warnings,
        )

    results = model(image_bgr, verbose=False)[0]
    names = results.names
    boxes = results.boxes
    if boxes is None or len(boxes) == 0:
        return DetectResponse(kind="photo", image_id=image_id, warnings=warnings)

    per_class_best: dict[str, float] = {}
    per_class_bbox: dict[str, tuple[float, ...]] = {}

    for i in range(len(boxes)):
        cls_idx = int(boxes.cls[i].item())
        conf = float(boxes.conf[i].item())
        cls_id = names.get(cls_idx, str(cls_idx))
        if cls_id not in PHOTO_CLASSES:
            continue
        spec = PHOTO_CLASSES[cls_id]
        xyxy = tuple(float(v) for v in boxes.xyxy[i].tolist())
        annotations.append(
            Annotation(
                object_class=cls_id,
                label=spec.label,
                bbox=_bbox_norm(xyxy, w, h),
                confidence=conf,
                color=color_of("photo", cls_id),
                source="yolo",
            )
        )
        if conf > per_class_best.get(cls_id, 0.0):
            per_class_best[cls_id] = conf
            per_class_bbox[cls_id] = xyxy

    # Emit one FieldValue per distinct fixture class at its best confidence.
    for cls_id, conf in per_class_best.items():
        if cls_id in FIXTURE_FIELD:
            field, value = FIXTURE_FIELD[cls_id]
            xyxy = per_class_bbox[cls_id]
            fields.append(
                FieldValue(
                    field=field,
                    value=value,
                    source="yolo",
                    confidence=conf,
                    evidence_bbox=_bbox_norm(xyxy, w, h),
                    evidence_image_id=image_id,
                )
            )

    # Bath-only implies no level-access shower unless a shower was also detected.
    if "bathtub" in per_class_best and "level_access_shower" not in per_class_best and "shower_over_bath" not in per_class_best:
        fields.append(
            FieldValue(
                field="bathroom_has_level_access_shower",
                value=False,
                source="yolo",
                confidence=0.7,
                evidence_image_id=image_id,
            )
        )

    return DetectResponse(
        kind="photo",
        image_id=image_id,
        annotations=annotations,
        fields=fields,
        warnings=warnings,
    )
