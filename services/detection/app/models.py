"""Lazy model loaders. Weights paths are configurable via env vars so deploys can mount
different checkpoints (e.g. `weights/floorplan.pt`, `weights/photos.pt`, `weights/sam_vit_h.pth`).

If weights aren't present, the loader returns None and the pipeline degrades gracefully
(returns empty detections with a warning). This lets the service run end-to-end on day 1
while training catches up.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import structlog

log = structlog.get_logger()

WEIGHTS_DIR = Path(os.getenv("HOMINGO_WEIGHTS_DIR", "./weights"))
FLOORPLAN_WEIGHTS = os.getenv("HOMINGO_FLOORPLAN_WEIGHTS", str(WEIGHTS_DIR / "floorplan.pt"))
PHOTO_WEIGHTS = os.getenv("HOMINGO_PHOTO_WEIGHTS", str(WEIGHTS_DIR / "photos.pt"))
SAM_WEIGHTS = os.getenv("HOMINGO_SAM_WEIGHTS", str(WEIGHTS_DIR / "sam_vit_h.pth"))
SAM_MODEL_TYPE = os.getenv("HOMINGO_SAM_MODEL_TYPE", "vit_h")

_floorplan_model = None
_photo_model = None
_sam_predictor = None
_ocr_engine = None


def _yolo_or_none(weights_path: str):
    if not Path(weights_path).exists():
        log.warning("yolo_weights_missing", path=weights_path)
        return None
    from ultralytics import YOLO

    return YOLO(weights_path)


def load_floorplan_model():
    global _floorplan_model
    if _floorplan_model is None:
        _floorplan_model = _yolo_or_none(FLOORPLAN_WEIGHTS)
    return _floorplan_model


def load_photo_model():
    global _photo_model
    if _photo_model is None:
        _photo_model = _yolo_or_none(PHOTO_WEIGHTS)
    return _photo_model


def load_sam_predictor():
    """SAM refines YOLO masks into tight room polygons. Heavy — ~2.5 GB for vit_h."""
    global _sam_predictor
    if _sam_predictor is not None:
        return _sam_predictor
    if not Path(SAM_WEIGHTS).exists():
        log.warning("sam_weights_missing", path=SAM_WEIGHTS)
        return None
    try:
        import torch
        from segment_anything import sam_model_registry, SamPredictor

        device = "cuda" if torch.cuda.is_available() else "cpu"
        sam = sam_model_registry[SAM_MODEL_TYPE](checkpoint=SAM_WEIGHTS)
        sam.to(device=device)
        _sam_predictor = SamPredictor(sam)
        return _sam_predictor
    except Exception as exc:
        log.error("sam_load_failed", error=str(exc))
        return None


def load_ocr():
    global _ocr_engine
    if os.getenv("HOMINGO_DISABLE_OCR", "").lower() in {"1", "true", "yes"}:
        return None
    if _ocr_engine is None:
        try:
            from rapidocr_onnxruntime import RapidOCR

            _ocr_engine = RapidOCR()
        except Exception as exc:
            log.error("rapidocr_load_failed", error=str(exc))
            _ocr_engine = None
    return _ocr_engine
