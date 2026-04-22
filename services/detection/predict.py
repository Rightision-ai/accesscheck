"""Cog (Replicate) entrypoint.

Contract: returns a JSON payload matching DetectResponse. Replicate cold-starts ~10–30s,
then ~2–5s per inference on T4. If you want faster, bump to A10G in cog.yaml.
"""
from __future__ import annotations

from typing import Any

from cog import BasePredictor, Input, Path  # type: ignore

from app.pipeline import load_image, run_detection


class Predictor(BasePredictor):
    def setup(self) -> None:
        # Warm-load models so the first prediction isn't slow.
        from app.models import load_floorplan_model, load_photo_model, load_ocr

        load_floorplan_model()
        load_photo_model()
        load_ocr()

    def predict(
        self,
        image: Path = Input(description="Floor plan or photo"),
        kind: str = Input(description="floor_plan or photo", default="floor_plan"),
        image_id: str = Input(description="Client-supplied id echoed back", default=""),
        known_scale_px_per_mm: float = Input(
            description="Skip auto-scale fitting if the client already knows px/mm",
            default=0.0,
        ),
    ) -> dict[str, Any]:
        with open(image, "rb") as f:
            bytes_ = f.read()
        img = load_image(image_bytes=bytes_)
        result = run_detection(
            kind=kind,  # type: ignore[arg-type]
            image_bgr=img,
            image_id=image_id or None,
            known_scale_px_per_mm=known_scale_px_per_mm or None,
        )
        return result.model_dump()
