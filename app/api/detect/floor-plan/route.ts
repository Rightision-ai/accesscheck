import { NextRequest, NextResponse } from "next/server";
import { runDetection } from "@/lib/detection/backend";

export const maxDuration = 60;

type Incoming = {
  images?: { mime_type: string; data: string; image_id?: string }[];
  image_url?: string;
  image_id?: string;
  known_scale_px_per_mm?: number;
};

export async function POST(req: NextRequest) {
  let body: Incoming;
  try {
    body = (await req.json()) as Incoming;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { images, image_url, image_id, known_scale_px_per_mm } = body;

  if (!images?.length && !image_url) {
    return NextResponse.json(
      { error: "Either `images[]` or `image_url` is required" },
      { status: 400 },
    );
  }

  try {
    const results = image_url
      ? [
          await runDetection({
            kind: "floor_plan",
            imageUrl: image_url,
            imageId: image_id,
            knownScalePxPerMm: known_scale_px_per_mm,
          }),
        ]
      : await Promise.all(
          (images ?? []).map((img, i) =>
            runDetection({
              kind: "floor_plan",
              imageB64: img.data,
              imageId: img.image_id ?? `image_${i}`,
              knownScalePxPerMm: known_scale_px_per_mm,
            }),
          ),
        );

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Detection backend error", message },
      { status: 502 },
    );
  }
}
