import { NextRequest, NextResponse } from "next/server";
import { runDetection } from "@/lib/detection/backend";

export const maxDuration = 60;

type Incoming = {
  images?: { mime_type: string; data: string; image_id?: string }[];
  image_url?: string;
  image_id?: string;
};

export async function POST(req: NextRequest) {
  let body: Incoming;
  try {
    body = (await req.json()) as Incoming;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { images, image_url, image_id } = body;

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
            kind: "photo",
            imageUrl: image_url,
            imageId: image_id,
          }),
        ]
      : await Promise.all(
          (images ?? []).map((img, i) =>
            runDetection({
              kind: "photo",
              imageB64: img.data,
              imageId: img.image_id ?? `image_${i}`,
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
