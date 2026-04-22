import "server-only";
import type { DetectionResponse, ImageKind } from "./types";

type BackendProvider = "fastapi" | "replicate";

type DetectInput = {
  kind: ImageKind;
  imageB64?: string;
  imageUrl?: string;
  imageId?: string;
  knownScalePxPerMm?: number;
};

function provider(): BackendProvider {
  const raw = (process.env.DETECTION_PROVIDER ?? "fastapi").toLowerCase();
  return raw === "replicate" ? "replicate" : "fastapi";
}

async function callFastApi(input: DetectInput): Promise<DetectionResponse> {
  const base = process.env.DETECTION_BASE_URL;
  if (!base) throw new Error("DETECTION_BASE_URL is not set");
  const token = process.env.DETECTION_BEARER_TOKEN;
  const res = await fetch(`${base.replace(/\/$/, "")}/detect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      kind: input.kind,
      image_b64: input.imageB64,
      image_url: input.imageUrl,
      image_id: input.imageId,
      known_scale_px_per_mm: input.knownScalePxPerMm,
    }),
  });
  if (!res.ok) {
    throw new Error(`Detection backend ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as DetectionResponse;
}

async function callReplicate(input: DetectInput): Promise<DetectionResponse> {
  const token = process.env.REPLICATE_API_TOKEN;
  const version = process.env.REPLICATE_MODEL_VERSION;
  if (!token || !version) {
    throw new Error("REPLICATE_API_TOKEN and REPLICATE_MODEL_VERSION must be set");
  }
  const imageArg = input.imageUrl
    ? input.imageUrl
    : input.imageB64
      ? `data:application/octet-stream;base64,${input.imageB64}`
      : null;
  if (!imageArg) throw new Error("Either imageUrl or imageB64 is required");

  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=55",
    },
    body: JSON.stringify({
      version,
      input: {
        image: imageArg,
        kind: input.kind,
        image_id: input.imageId ?? "",
        known_scale_px_per_mm: input.knownScalePxPerMm ?? 0,
      },
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Replicate create ${createRes.status}: ${await createRes.text()}`);
  }
  let prediction = await createRes.json();

  const deadline = Date.now() + 55_000;
  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled" &&
    Date.now() < deadline
  ) {
    await new Promise((r) => setTimeout(r, 1_500));
    const poll = await fetch(prediction.urls.get, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!poll.ok) throw new Error(`Replicate poll ${poll.status}`);
    prediction = await poll.json();
  }

  if (prediction.status !== "succeeded") {
    throw new Error(`Replicate status ${prediction.status}: ${prediction.error ?? ""}`);
  }
  return prediction.output as DetectionResponse;
}

export async function runDetection(input: DetectInput): Promise<DetectionResponse> {
  return provider() === "replicate" ? callReplicate(input) : callFastApi(input);
}
