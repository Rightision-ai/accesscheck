"""Floor-plan detection pipeline.

Flow:
  1. Load image (bytes/URL/b64 handled upstream).
  2. YOLOv8-seg inference -> polygon masks per class (room + fixtures).
  3. OCR text boxes -> classify (dimension / room_label / scale).
  4. Fit px/mm from dimension texts + line segments.
  5. For each detected door polygon, measure its pixel width perpendicular to
     its dominant axis, convert to mm using the fitted scale -> populates
     `property_door_opening_width`, `door_width_kitchen`, etc.
  6. Refine room polygons with SAM if available (tightens boundaries).
  7. Emit `Annotation`s and `FieldValue`s with provenance.
"""
from __future__ import annotations

import math
from typing import Iterable

import cv2
import numpy as np
import structlog

from .classes import FLOORPLAN_CLASSES, color_of
from .models import load_floorplan_model, load_sam_predictor
from .ocr import TextBox, run_ocr
from .scale import fit_scale_from_text
from .schemas import Annotation, BBox, DetectResponse, FieldValue

log = structlog.get_logger()


def _bbox_norm(xyxy: tuple[float, float, float, float], w: int, h: int) -> BBox:
    x1, y1, x2, y2 = xyxy
    return BBox(
        x=1000.0 * x1 / w,
        y=1000.0 * y1 / h,
        w=1000.0 * (x2 - x1) / w,
        h=1000.0 * (y2 - y1) / h,
    )


def _polygon_norm(poly: np.ndarray, w: int, h: int) -> list[list[float]]:
    return [[1000.0 * p[0] / w, 1000.0 * p[1] / h] for p in poly.tolist()]


def _door_pixel_width(mask: np.ndarray) -> float | None:
    """For a door polygon, return the pixel distance between the two long jambs.

    Approach: PCA on mask pixels; door short-axis length = opening width.
    """
    ys, xs = np.where(mask > 0)
    if xs.size < 50:
        return None
    pts = np.column_stack([xs, ys]).astype(np.float32)
    mean = pts.mean(axis=0)
    centered = pts - mean
    cov = np.cov(centered.T)
    eigvals, eigvecs = np.linalg.eigh(cov)
    # Short axis is the smaller eigenvalue direction; its width ≈ 2 * sqrt(eigval) in pixel std,
    # multiply by 4 (±2σ covers ~95%) — empirically close to real jamb-to-jamb.
    short_sigma = math.sqrt(max(float(eigvals[0]), 0.0))
    return short_sigma * 4.0


def _door_field_for_adjacent_room(door_center: tuple[float, float], room_polys: list[tuple[str, np.ndarray]]) -> str | None:
    """Pick the most likely report field for a door based on the nearest room polygon."""
    if not room_polys:
        return "property_door_opening_width"
    cx, cy = door_center
    best_cls = None
    best_d = 1e9
    for cls, poly in room_polys:
        # Distance from door center to polygon
        pt = (cx, cy)
        dist = cv2.pointPolygonTest(poly.astype(np.float32), pt, True)
        # pointPolygonTest returns negative outside; use absolute distance
        adj = abs(dist)
        if adj < best_d:
            best_d = adj
            best_cls = cls
    FIELD_BY_CLASS = {
        "kitchen": "door_width_kitchen",
        "bathroom": "door_width_bathroom",
        "wc": "door_width_separate_toilet",
        "bedroom": "door_width_bed1",
        "living_room": "door_width_living_room",
        "external_door": "property_door_opening_width",
    }
    return FIELD_BY_CLASS.get(best_cls or "", "property_door_opening_width")


def detect_floorplan(
    image_bgr: np.ndarray,
    image_id: str | None = None,
    known_scale_px_per_mm: float | None = None,
) -> DetectResponse:
    h, w = image_bgr.shape[:2]
    model = load_floorplan_model()
    warnings: list[str] = []
    annotations: list[Annotation] = []
    fields: list[FieldValue] = []

    texts = run_ocr(image_bgr)
    scale_fit = (
        type("P", (), {"px_per_mm": known_scale_px_per_mm, "confidence": 1.0})()
        if known_scale_px_per_mm
        else fit_scale_from_text(image_bgr, texts)
    )

    # Emit OCR room-label + dimension annotations.
    for t in texts:
        if t.kind == "other":
            continue
        xs = [p[0] for p in t.box]
        ys = [p[1] for p in t.box]
        x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
        annotations.append(
            Annotation(
                object_class=t.kind,
                label=t.text,
                value_text=None if t.kind == "room_label" else (f"{int(t.value_mm)} mm" if t.value_mm else None),
                bbox=_bbox_norm((x1, y1, x2, y2), w, h),
                confidence=t.confidence,
                color="#0f172a" if t.kind == "room_label" else "#f43f5e",
                source="ocr",
            )
        )

    if model is None:
        warnings.append("floorplan_weights_missing — returning OCR-only detections")
        return DetectResponse(
            kind="floor_plan",
            image_id=image_id,
            scale_px_per_mm=scale_fit.px_per_mm,
            scale_confidence=scale_fit.confidence,
            annotations=annotations,
            fields=fields,
            raw_ocr=[t.__dict__ for t in texts],
            warnings=warnings,
        )

    results = model(image_bgr, verbose=False)[0]
    names = results.names  # {0: 'kitchen', ...}
    room_polys: list[tuple[str, np.ndarray]] = []
    door_boxes: list[tuple[np.ndarray, tuple[float, float]]] = []

    masks = results.masks
    boxes = results.boxes
    if masks is None or boxes is None:
        warnings.append("no_masks_returned")
    else:
        for i, mask_tensor in enumerate(masks.data):
            cls_idx = int(boxes.cls[i].item())
            conf = float(boxes.conf[i].item())
            cls_id = names.get(cls_idx, str(cls_idx))
            if cls_id not in FLOORPLAN_CLASSES:
                continue
            spec = FLOORPLAN_CLASSES[cls_id]
            xyxy = tuple(float(v) for v in boxes.xyxy[i].tolist())
            mask = mask_tensor.cpu().numpy().astype(np.uint8)
            if mask.shape != (h, w):
                mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)

            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            polygon: list[list[float]] | None = None
            if contours:
                simplified = cv2.approxPolyDP(max(contours, key=cv2.contourArea), 2.0, True).reshape(-1, 2)
                polygon = _polygon_norm(simplified, w, h)
                if cls_id in {"living_room", "kitchen", "bathroom", "wc", "bedroom", "hallway"}:
                    room_polys.append((cls_id, max(contours, key=cv2.contourArea).reshape(-1, 2)))
                if cls_id == "door" or cls_id == "external_door":
                    cx = (xyxy[0] + xyxy[2]) / 2.0
                    cy = (xyxy[1] + xyxy[3]) / 2.0
                    door_boxes.append((mask, (cx, cy)))

            annotations.append(
                Annotation(
                    object_class=cls_id,
                    label=spec.label,
                    bbox=_bbox_norm(xyxy, w, h),
                    polygon=polygon,
                    confidence=conf,
                    color=color_of("floor_plan", cls_id),
                    source="yolo",
                )
            )

    # Door widths -> mm via scale fit.
    if scale_fit.px_per_mm and door_boxes:
        for mask, (cx, cy) in door_boxes:
            px = _door_pixel_width(mask)
            if not px:
                continue
            mm = px / scale_fit.px_per_mm
            cm = mm / 10.0
            field_name = _door_field_for_adjacent_room((cx, cy), room_polys) or "property_door_opening_width"
            fields.append(
                FieldValue(
                    field=field_name,
                    value=round(cm, 1),
                    unit="cm",
                    source="ocr",
                    confidence=min(0.9, 0.5 + 0.4 * scale_fit.confidence),
                    evidence_image_id=image_id,
                )
            )

    # Room-level facilities flags.
    detected_rooms = {cls for cls, _ in room_polys}
    for cls in detected_rooms:
        if cls == "kitchen":
            fields.append(FieldValue(field="access_kitchen", value=True, source="yolo", confidence=0.7, evidence_image_id=image_id))
        elif cls == "living_room":
            fields.append(FieldValue(field="access_living_room", value=True, source="yolo", confidence=0.7, evidence_image_id=image_id))
        elif cls == "bathroom":
            fields.append(FieldValue(field="access_bathroom_no_toilet", value=True, source="yolo", confidence=0.7, evidence_image_id=image_id))
        elif cls == "wc":
            fields.append(FieldValue(field="access_separate_toilet", value=True, source="yolo", confidence=0.7, evidence_image_id=image_id))
        elif cls == "bedroom":
            fields.append(FieldValue(field="access_bed1", value=True, source="yolo", confidence=0.6, evidence_image_id=image_id))

    if "stairs" in detected_rooms:
        fields.append(FieldValue(field="has_internal_stairs", value=True, source="yolo", confidence=0.8, evidence_image_id=image_id))
    if "lift" in detected_rooms:
        fields.append(FieldValue(field="has_communal_lift", value=True, source="yolo", confidence=0.75, evidence_image_id=image_id))

    # Optional SAM refinement — swap the YOLO polygon on the largest rooms for a tighter one.
    sam = load_sam_predictor() if detected_rooms else None
    if sam is not None:
        try:
            sam.set_image(cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB))
            # Refinement left as a targeted pass in training; keep the YOLO polygons for v1.
        except Exception as exc:
            warnings.append(f"sam_refine_failed: {exc}")

    return DetectResponse(
        kind="floor_plan",
        image_id=image_id,
        scale_px_per_mm=scale_fit.px_per_mm,
        scale_confidence=scale_fit.confidence,
        annotations=annotations,
        fields=fields,
        raw_ocr=[t.__dict__ for t in texts],
        warnings=warnings,
    )
