# GPU image for AWS ECS / EKS, Azure Container Apps, SageMaker, Modal, self-hosted runners.
# For a CPU-only dev image, swap the base to `python:3.11-slim` and use `paddlepaddle` (not GPU).
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    HOMINGO_WEIGHTS_DIR=/app/weights

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-dev python3-pip python3.11-venv \
    git libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1 \
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

WORKDIR /app

COPY requirements.txt /app/requirements.txt
# GPU variant of paddle replaces the default requirement.
RUN pip install --upgrade pip \
    && sed -i 's/^paddlepaddle==/paddlepaddle-gpu==/' /app/requirements.txt \
    && pip install -r /app/requirements.txt \
    && pip install --no-deps git+https://github.com/facebookresearch/segment-anything.git \
    && pip install torch==2.4.1 torchvision==0.19.1 --index-url https://download.pytorch.org/whl/cu121

COPY app /app/app
COPY predict.py /app/predict.py

EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
