"""Fit pixels-per-millimetre from dimension text + nearby wall segments.

Strategy
--------
For each dimension text box with a known mm value, find the nearest straight line
segment in the image; if its pixel length is plausibly the measurement's length,
add (pixel_len, mm_value) as a candidate. Then RANSAC-fit px_per_mm.

Fallback: use the document scale (1:50 etc.) if present — common DPI for A3 plans
is 300 DPI, giving 300 / 25.4 ≈ 11.81 px per real-mm; adjust by the plan's scale.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import cv2
import numpy as np

from .ocr import TextBox


@dataclass
class ScaleFit:
    px_per_mm: float | None
    confidence: float


def _poly_center(poly: list[list[float]]) -> tuple[float, float]:
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    return sum(xs) / len(xs), sum(ys) / len(ys)


def _detect_line_segments(image_gray: np.ndarray) -> np.ndarray:
    edges = cv2.Canny(image_gray, 50, 150)
    segs = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=math.pi / 180,
        threshold=80,
        minLineLength=60,
        maxLineGap=4,
    )
    return segs if segs is not None else np.empty((0, 1, 4))


def _seg_length(x1: float, y1: float, x2: float, y2: float) -> float:
    return math.hypot(x2 - x1, y2 - y1)


def fit_scale_from_text(
    image_bgr: np.ndarray,
    texts: list[TextBox],
    explicit_doc_scale: int | None = None,
) -> ScaleFit:
    dims = [t for t in texts if t.kind == "dimension" and t.value_mm]
    if not dims:
        # No measurable dimensions. If an explicit scale was read (e.g. "1:50"), assume
        # 300 DPI A3 plan; calibrate later during integration testing.
        if explicit_doc_scale:
            px_per_mm = 300.0 / 25.4 / explicit_doc_scale
            return ScaleFit(px_per_mm=px_per_mm, confidence=0.3)
        return ScaleFit(px_per_mm=None, confidence=0.0)

    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    segments = _detect_line_segments(gray)
    if segments.size == 0:
        return ScaleFit(px_per_mm=None, confidence=0.0)

    candidates: list[float] = []
    for t in dims:
        cx, cy = _poly_center(t.box)
        best_len = None
        best_d = 1e9
        for s in segments.reshape(-1, 4):
            x1, y1, x2, y2 = s
            mx, my = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            d = math.hypot(mx - cx, my - cy)
            if d < best_d:
                best_d = d
                best_len = _seg_length(x1, y1, x2, y2)
        if best_len and best_len > 10 and t.value_mm:
            candidates.append(best_len / t.value_mm)

    if not candidates:
        return ScaleFit(px_per_mm=None, confidence=0.0)

    # Trimmed median: drop outliers beyond 1.5 IQR.
    arr = np.array(candidates)
    q1, q3 = np.percentile(arr, [25, 75])
    iqr = q3 - q1
    mask = (arr >= q1 - 1.5 * iqr) & (arr <= q3 + 1.5 * iqr)
    inliers = arr[mask] if mask.sum() else arr
    px_per_mm = float(np.median(inliers))
    confidence = min(1.0, 0.5 + 0.05 * len(inliers))
    return ScaleFit(px_per_mm=px_per_mm, confidence=confidence)
