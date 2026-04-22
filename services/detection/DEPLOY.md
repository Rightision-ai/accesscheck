# Deploying the Homingo Detection Service

The Next.js app stays on **Vercel**. The Python service deploys separately anywhere that can run a CUDA container. Below are five options, ranked by how well they fit this workload.

> **TL;DR.** If you want the cheapest, easiest path: use **Replicate**. If you're committed to AWS: **ECS Fargate + EC2 G5 behind an ALB**, or **SageMaker Serverless** for a managed option. If you're committed to Azure: **Azure Container Apps with GPU workload profile**, or **Azure ML Online Endpoint**. **Do not try to host this on Vercel** — it has no GPU runtime and a 300 s function cap.

---

## Option 1 — Replicate (recommended)

Pay-per-second GPU, zero infra. Cold start 10–30 s; warm inference ~2–5 s on T4. Roughly £0.001–0.003 per call on T4.

```bash
# 1. Install Cog
brew install cog
cog login

# 2. Build locally (CUDA images are big; expect ~6 GB)
cd services/detection
cog build -t homingo-detection

# 3. Push to Replicate (creates the model if missing)
cog push r8.im/<your-user>/homingo-detection

# 4. Call from Next.js
#    POST https://api.replicate.com/v1/predictions
#    body: { version: "<sha>", input: { image: <url>, kind: "floor_plan" } }
```

**Env vars / secrets to set on Replicate:** none required; weights bake into the image.

**Next.js wiring:** add `REPLICATE_API_TOKEN` and `REPLICATE_MODEL_VERSION` to Vercel. The `/api/detect/*` routes POST to Replicate, poll for completion, and return the JSON.

**Warm starts:** Replicate auto-scales to zero. If latency matters, pay for an **always-on** instance (flat monthly fee) instead of per-second.

---

## Option 2 — Modal

Python-native serverless with similar per-second pricing. Nicer DX if you want to iterate without rebuilding images.

```bash
pip install modal
modal token new

# Create a Modal app file (modal_app.py) that wraps app.main:app behind @app.function(gpu="T4")
modal deploy modal_app.py
```

Modal has generous free GPU credits for new accounts and faster cold starts than Replicate on some tiers.

---

## Option 3 — AWS

### 3a. ECS on Fargate + EC2 G5 (recommended AWS path)

Fargate has **no GPU**, so the pattern is: run the task on an EC2 capacity provider with `g5.xlarge` (A10G, £0.80/hr on-demand), put it behind an Application Load Balancer, and autoscale by CPU.

```bash
# 1. Build + push to ECR
aws ecr create-repository --repository-name homingo-detection
aws ecr get-login-password | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com

docker build -t homingo-detection services/detection
docker tag homingo-detection <acct>.dkr.ecr.<region>.amazonaws.com/homingo-detection:latest
docker push <acct>.dkr.ecr.<region>.amazonaws.com/homingo-detection:latest

# 2. Create ECS cluster with EC2 capacity provider
#    - AMI: ECS-optimised Amazon Linux 2 (GPU)
#    - Instance type: g5.xlarge
#    - Auto Scaling Group: min 0, max N (scale from zero saves money overnight)

# 3. Task definition — key bits:
#    - "resourceRequirements": [{ "type": "GPU", "value": "1" }]
#    - memory: 8192, cpu: 4096
#    - environment: HOMINGO_SERVICE_TOKEN, HOMINGO_WEIGHTS_DIR=/app/weights

# 4. Service behind ALB with HTTPS (ACM cert), health check on /health
```

**Trade-offs:** cheapest per inference if volume is high; you're on the hook for scale-to-zero logic, patching, and an EC2 bill even when idle unless you carefully tune the ASG.

### 3b. SageMaker Serverless Inference

Managed, scale-to-zero, but **no GPU in serverless tier**. Only viable if the service runs on CPU (much slower — 10–20 s per inference).

### 3c. SageMaker Real-Time Endpoint on `ml.g5.xlarge`

Managed GPU, always-on, ~£600/mo for one G5. Good if you want SageMaker's monitoring and A/B-test plumbing.

```bash
# Build to ECR as in 3a, then:
aws sagemaker create-model --model-name homingo-detection \
  --primary-container Image=<ecr-uri>,Environment="{HOMINGO_SERVICE_TOKEN=...}" \
  --execution-role-arn arn:aws:iam::<acct>:role/SageMakerRole

aws sagemaker create-endpoint-config --endpoint-config-name homingo-detection \
  --production-variants VariantName=default,ModelName=homingo-detection,InstanceType=ml.g5.xlarge,InitialInstanceCount=1

aws sagemaker create-endpoint --endpoint-name homingo-detection-prod \
  --endpoint-config-name homingo-detection
```

### 3d. AWS Lambda — **not viable**

Lambda has no GPU, 10 GB memory cap, 15 min timeout, and 10 GB container image limit. The CUDA image here is ~6 GB and needs GPU. Skip.

---

## Option 4 — Azure

### 4a. Azure Container Apps with GPU workload profile (recommended Azure path)

ACA added dedicated GPU workload profiles (NVIDIA A100/T4) in late 2024. Scale-to-zero, pay-per-second, managed.

```bash
# 1. Build + push to Azure Container Registry
az acr create -n homingoacr -g homingo-rg --sku Standard
az acr login -n homingoacr
docker build -t homingoacr.azurecr.io/homingo-detection:latest services/detection
docker push homingoacr.azurecr.io/homingo-detection:latest

# 2. Create a Container Apps environment with a GPU workload profile
az containerapp env create -n homingo-env -g homingo-rg --location eastus \
  --enable-workload-profiles
az containerapp env workload-profile add -n homingo-env -g homingo-rg \
  --workload-profile-name gpu --workload-profile-type Consumption-GPU-NC24-A100

# 3. Deploy
az containerapp create -n homingo-detection -g homingo-rg \
  --environment homingo-env \
  --workload-profile-name gpu \
  --image homingoacr.azurecr.io/homingo-detection:latest \
  --target-port 8080 --ingress external \
  --min-replicas 0 --max-replicas 5 \
  --secrets service-token=<generated-token> \
  --env-vars HOMINGO_SERVICE_TOKEN=secretref:service-token
```

### 4b. Azure ML Online Endpoint

Managed inference with GPU VMs (e.g. `Standard_NC6s_v3`). Similar to SageMaker real-time. Good observability but always-on billing.

### 4c. Azure Functions — **not viable**

No GPU. Same reasoning as Lambda.

---

## Option 5 — Vercel — **not viable**

Vercel's runtimes (Node Edge, Node Serverless, Python) have:
- No GPU (CPU-only)
- 300 s max execution time on Pro, 60 s on Hobby
- 50 MB compressed bundle limit on Edge; serverless OK but no CUDA

Keep the Next.js app on Vercel. The app hits the detection service via `/api/detect/*` routes that proxy to Replicate/Modal/AWS/Azure over HTTPS.

---

## What the Next.js app needs (any option)

Add to Vercel project env:

```
DETECTION_BASE_URL=https://<your-service-url>
DETECTION_BEARER_TOKEN=<same value as HOMINGO_SERVICE_TOKEN>
NEXT_PUBLIC_DETECTION_V2=true   # feature flag; old Gemini path stays live until flipped
```

The `/api/detect/floor-plan` and `/api/detect/photo` routes (landing in the next step) read these and forward the upload. The browser never talks to the inference backend directly.

## Cold-start mitigation

Cold start is 10–30 s on all serverless GPU options. The UX pattern:
1. When the wizard reaches step 3/4 (upload), kick off detection immediately with `runInBackground: true`.
2. The user continues filling earlier fields (client info, etc.) while detection runs.
3. By step 5, results are usually ready; otherwise show a toast ("still analysing…").

If tail-latency ever becomes a customer-visible problem, pay for **always-warm** capacity on the chosen provider (flat monthly fee) instead of per-second.

## Observability

- **Healthcheck:** `GET /health` returns `{"ok":true}` — wire to your load balancer / platform health probes.
- **Logs:** structlog JSON on stdout — Replicate/Modal/ACA/ECS all scrape stdout.
- **Metrics:** add Prometheus later if needed; start with provider-native metrics (Replicate dashboard, CloudWatch, Log Analytics).

## Cost ballpark (Dec 2025 prices)

| Option | Cold/s | Warm/req (T4) | Idle/day | Best when |
|---|---|---|---|---|
| Replicate | 10–30 s | ~3 s @ £0.0015 | £0 | MVP, low/variable traffic |
| Modal | 5–15 s | ~3 s @ £0.0012 | £0 | You like Python deploys |
| AWS ECS + G5 (scale-to-zero via ASG) | 60–90 s | ~2 s | £0 if ASG=0 | Existing AWS shop |
| AWS SageMaker Real-Time G5 | 0 s | ~2 s | £20/day (always-on) | High, steady traffic |
| Azure Container Apps GPU | 10–30 s | ~3 s | £0 | Existing Azure shop |
| Azure ML Online Endpoint | 0 s | ~2 s | £15/day (always-on) | Observability matters |

(Numbers ballpark only — double-check each provider's current rate card.)
