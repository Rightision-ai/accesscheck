"""FastAPI entrypoint for container deployments (AWS ECS/EKS, Azure Container Apps, etc).

Endpoints:
  GET  /health               -> liveness
  POST /detect/floor-plan    -> floor-plan pipeline
  POST /detect/photo         -> photo-fixtures pipeline
  POST /detect               -> auto-dispatch based on `kind` in body

Authentication: if HOMINGO_SERVICE_TOKEN is set, clients must send
`Authorization: Bearer <token>`.
"""
from __future__ import annotations

import os
from typing import Literal

import structlog
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile

from .pipeline import load_image, run_detection
from .schemas import DetectRequest, DetectResponse

log = structlog.get_logger()
app = FastAPI(title="Homingo Detection", version="1.0.0")

SERVICE_TOKEN = os.getenv("HOMINGO_SERVICE_TOKEN")


def _auth(authorization: str | None) -> None:
    if not SERVICE_TOKEN:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    if authorization.removeprefix("Bearer ").strip() != SERVICE_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid token")


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/detect", response_model=DetectResponse)
async def detect(req: DetectRequest, authorization: str | None = Header(default=None)) -> DetectResponse:
    _auth(authorization)
    try:
        image = load_image(image_url=req.image_url, image_b64=req.image_b64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Image load failed: {exc}") from exc
    return run_detection(
        kind=req.kind,
        image_bgr=image,
        image_id=req.image_id,
        known_scale_px_per_mm=req.known_scale_px_per_mm,
    )


@app.post("/detect/floor-plan", response_model=DetectResponse)
async def detect_floor_plan_multipart(
    file: UploadFile = File(...),
    image_id: str | None = Form(default=None),
    known_scale_px_per_mm: float | None = Form(default=None),
    authorization: str | None = Header(default=None),
) -> DetectResponse:
    _auth(authorization)
    bytes_ = await file.read()
    image = load_image(image_bytes=bytes_)
    return run_detection("floor_plan", image, image_id=image_id, known_scale_px_per_mm=known_scale_px_per_mm)


@app.post("/detect/photo", response_model=DetectResponse)
async def detect_photo_multipart(
    file: UploadFile = File(...),
    image_id: str | None = Form(default=None),
    authorization: str | None = Header(default=None),
) -> DetectResponse:
    _auth(authorization)
    bytes_ = await file.read()
    image = load_image(image_bytes=bytes_)
    return run_detection("photo", image, image_id=image_id)
