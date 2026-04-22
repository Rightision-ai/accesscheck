# Homingo Detection Service

Self-hosted CV pipeline: **YOLOv8-seg** (floor plans + photo fixtures) + **SAM** (room polygon refinement) + **PaddleOCR** (dimension / label extraction + pixels-per-mm calibration). Replaces the Gemini vision estimator with verifiable, provenance-stamped detections.

## Local dev (CPU)

```bash
cd services/detection
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install --no-deps git+https://github.com/facebookresearch/segment-anything.git

# Weights go in ./weights (see below). Service runs without them and returns empty
# detections + a warning, so you can smoke-test end-to-end before training finishes.
uvicorn app.main:app --reload --port 8080
```

```bash
curl -X POST http://localhost:8080/detect \
  -H "Content-Type: application/json" \
  -d '{"image_url":"https://example.com/plan.png","kind":"floor_plan"}'
```

## Weights layout

```
services/detection/weights/
├── floorplan.pt       # YOLOv8-seg fine-tuned on CubiCasa5K
├── photos.pt          # YOLOv8 fine-tuned on Open Images + ADE20K + Roboflow + internal
└── sam_vit_h.pth      # Facebook SAM ViT-H (optional — refines room masks)
```

Override paths via env vars: `HOMINGO_FLOORPLAN_WEIGHTS`, `HOMINGO_PHOTO_WEIGHTS`, `HOMINGO_SAM_WEIGHTS`.

## Training

### Floor plan (CubiCasa5K)

```bash
# 1. Download the dataset from https://zenodo.org/record/2613548
# 2. Convert to YOLO-seg format
python -m training.cubicasa5k.prepare --input /data/cubicasa5k --output /data/cubicasa5k_yolo

# 3. Train (single GPU, T4 or better)
yolo segment train model=yolov8m-seg.pt data=training/cubicasa5k/cubicasa5k.yaml \
  epochs=150 imgsz=1024 batch=8 project=runs/floorplan
```

### Photos (fixtures)

```bash
python -m training.photos.merge_datasets \
  --open-images /data/openimages \
  --ade20k /data/ade20k \
  --roboflow /data/roboflow_fixtures \
  --output /data/homingo_photos_yolo

yolo detect train model=yolov8m.pt data=/data/homingo_photos_yolo/data.yaml \
  epochs=100 imgsz=640 batch=16 project=runs/photos
```

## Auth

Set `HOMINGO_SERVICE_TOKEN=<secret>` in the service environment. The Next.js app then sends `Authorization: Bearer <secret>` on every call.

## Deployment

See [`DEPLOY.md`](./DEPLOY.md) for step-by-step instructions on Replicate, Modal, AWS (ECS Fargate + EC2 G5, SageMaker Serverless), Azure (Container Apps with GPU, Azure ML Online Endpoint), and Vercel (why you can't host GPU inference there).
