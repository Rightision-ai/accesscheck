"""Image loaders + dispatcher used by both the FastAPI app and the Cog predictor."""
from __future__ import annotations

import base64
import io
from typing import Literal

import cv2
import httpx
import numpy as np
from PIL import Image

from .floorplan import detect_floorplan
from .photos import detect_photo
from .schemas import DetectResponse


def load_image(
    image_url: str | None = None,
    image_b64: str | None = None,
    image_bytes: bytes | None = None,
) -> np.ndarray:
    if image_bytes is None:
        if image_url:
            resp = httpx.get(image_url, timeout=30.0, follow_redirects=True)
            resp.raise_for_status()
            image_bytes = resp.content
        elif image_b64:
            image_bytes = base64.b64decode(image_b64)
        else:
            raise ValueError("One of image_url / image_b64 / image_bytes is required")
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


def run_detection(
    kind: Literal["floor_plan", "photo"],
    image_bgr: np.ndarray,
    image_id: str | None = None,
    known_scale_px_per_mm: float | None = None,
) -> DetectResponse:
    if kind == "floor_plan":
        return detect_floorplan(image_bgr, image_id=image_id, known_scale_px_per_mm=known_scale_px_per_mm)
    return detect_photo(image_bgr, image_id=image_id)
