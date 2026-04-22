// Browser-side helpers. The wizard calls these; they hit the proxy routes which forward
// to whichever backend DETECTION_PROVIDER points at.

import type {
  DetectionResponse,
  DetectionState,
  ImageKind,
} from "./types";

type ImagePayload = {
  mime_type: string;
  data: string;
  image_id?: string;
};

async function post(
  path: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<DetectionResponse[]> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { success: boolean; results: DetectionResponse[] };
  if (!json.success) throw new Error(`${path} returned success=false`);
  return json.results;
}

export async function detectFloorPlans(
  images: ImagePayload[],
  signal?: AbortSignal,
): Promise<DetectionResponse[]> {
  if (!images.length) return [];
  return post("/api/detect/floor-plan", { images }, signal);
}

export async function detectPhotos(
  images: ImagePayload[],
  signal?: AbortSignal,
): Promise<DetectionResponse[]> {
  if (!images.length) return [];
  return post("/api/detect/photo", { images }, signal);
}

export async function detectByUrl(
  kind: ImageKind,
  imageUrl: string,
  imageId?: string,
  signal?: AbortSignal,
): Promise<DetectionResponse> {
  const path = kind === "floor_plan" ? "/api/detect/floor-plan" : "/api/detect/photo";
  const results = await post(path, { image_url: imageUrl, image_id: imageId }, signal);
  return results[0];
}

export async function detectAll(
  floorPlans: ImagePayload[],
  photos: ImagePayload[],
  signal?: AbortSignal,
): Promise<DetectionState> {
  const [fp, ph] = await Promise.all([
    detectFloorPlans(floorPlans, signal),
    detectPhotos(photos, signal),
  ]);
  return { floorPlans: fp, photos: ph };
}

export async function fileToPayload(file: File): Promise<ImagePayload> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return {
    mime_type: file.type || "application/octet-stream",
    data: btoa(binary),
    image_id: file.name,
  };
}
