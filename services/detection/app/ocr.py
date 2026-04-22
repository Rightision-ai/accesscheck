"""OCR + regex classification of text boxes on a floor plan.

PaddleOCR returns `[[box, (text, conf)], ...]`. We classify each box as one of:
  dimension   — e.g. "3450", "3.45 m", "1200 mm"
  room_label  — e.g. "Kitchen", "Bed 1"
  scale       — e.g. "1:50", "scale 1:100"
  other
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

import numpy as np

from .models import load_ocr

TextKind = Literal["dimension", "room_label", "scale", "other"]


@dataclass
class TextBox:
    text: str
    kind: TextKind
    box: list[list[float]]   # polygon [[x, y], ...] in pixel coords
    confidence: float
    value_mm: float | None = None


_ROOM_WORDS = {
    "kitchen", "bath", "bathroom", "bed", "bedroom", "lounge", "living",
    "hall", "hallway", "corridor", "wc", "toilet", "shower", "utility",
    "store", "cupboard", "dining", "study", "landing", "entrance", "lobby",
}

_DIM_RE = re.compile(r"(\d+(?:[\.,]\d+)?)\s*(mm|cm|m)?\b", re.IGNORECASE)
_SCALE_RE = re.compile(r"\b1\s*[:\/]\s*(\d{2,4})\b")


def _to_mm(value: float, unit: str | None) -> float | None:
    if unit is None:
        # bare number > 100 on a plan is almost always mm
        if value >= 100:
            return value
        # small bare numbers are ambiguous; reject to avoid false dims
        return None
    u = unit.lower()
    if u == "mm":
        return value
    if u == "cm":
        return value * 10.0
    if u == "m":
        return value * 1000.0
    return None


def classify_text(text: str) -> tuple[TextKind, float | None]:
    s = text.strip().lower()
    if not s:
        return "other", None

    m = _SCALE_RE.search(s)
    if m:
        try:
            return "scale", float(m.group(1))
        except ValueError:
            pass

    if any(w in s for w in _ROOM_WORDS):
        return "room_label", None

    m = _DIM_RE.fullmatch(s.replace(",", "."))
    if m:
        try:
            value = float(m.group(1))
            mm = _to_mm(value, m.group(2))
            if mm is not None:
                return "dimension", mm
        except ValueError:
            pass

    return "other", None


def run_ocr(image: np.ndarray) -> list[TextBox]:
    ocr = load_ocr()
    if ocr is None:
        return []
    # RapidOCR returns (list[[box, text, conf]] | None, elapse)
    result, _ = ocr(image)
    out: list[TextBox] = []
    for item in result or []:
        box, text, conf = item
        kind, value = classify_text(text)
        out.append(
            TextBox(
                text=text,
                kind=kind,
                box=[[float(x), float(y)] for x, y in box],
                confidence=float(conf),
                value_mm=value,
            )
        )
    return out
