import { createClient } from "@/lib/supabase/client";

const BASE64_DATA_URL_REGEX = /^data:image\/[a-z]+;base64,/;

function isBase64DataUrl(s: unknown): s is string {
  return typeof s === "string" && BASE64_DATA_URL_REGEX.test(s);
}

export async function uploadBase64ToStorage(
  dataUrl: string,
  path: string,
  bucket: string = "evidences",
): Promise<string> {
  const supabase = createClient();
  const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  const mimeType = match?.[1] || "image/jpeg";
  const base64 = match?.[2] || dataUrl.replace(/^data:[^;]+;base64,/, "");

  const byteChars = atob(base64);
  const byteNumbers = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, byteNumbers, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}

/**
 * Recursively find all base64 data URLs, upload to Supabase Storage,
 * and return a new object with URLs replacing base64. Deduplicates same images.
 */
export async function uploadImagesAndReplaceUrls<T extends object>(
  obj: T,
  prefix = "survey"
): Promise<T> {
  const base64ToUrl = new Map<string, string>();
  let counter = 0;

  const collectBase64 = (val: unknown, seen = new Set<string>()): string[] => {
    if (isBase64DataUrl(val) && !seen.has(val)) {
      seen.add(val);
      return [val];
    }
    if (Array.isArray(val)) {
      return val.flatMap((v) => collectBase64(v, seen));
    }
    if (val && typeof val === "object" && val !== null && !(val instanceof Blob)) {
      return Object.values(val).flatMap((v) => collectBase64(v, seen));
    }
    return [];
  };

  const replaceInObject = (
    val: unknown,
    map: Map<string, string>
  ): unknown => {
    if (isBase64DataUrl(val)) {
      return map.get(val) ?? val;
    }
    if (Array.isArray(val)) {
      return val.map((v) => replaceInObject(v, map));
    }
    if (val && typeof val === "object" && val !== null && !(val instanceof Blob)) {
      return Object.fromEntries(
        Object.entries(val).map(([k, v]) => [k, replaceInObject(v, map)])
      );
    }
    return val;
  };

  const allBase64 = collectBase64(obj);
  for (const dataUrl of allBase64) {
    if (!base64ToUrl.has(dataUrl)) {
      const path = `${prefix}/${Date.now()}-${counter++}.jpg`;
      const url = await uploadBase64ToStorage(dataUrl, path);
      base64ToUrl.set(dataUrl, url);
    }
  }

  return replaceInObject(obj, base64ToUrl) as T;
}
