/**
 * Detects if a file is HEIC/HEIF format (iPhone default photo format).
 * iOS may send application/octet-stream for HEIC, so we also check extension.
 */
function isHeicFile(file: File): boolean {
  const type = file.type?.toLowerCase();
  const name = file.name?.toLowerCase() ?? "";
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    (type === "application/octet-stream" && (name.endsWith(".heic") || name.endsWith(".heif")))
  );
}

/**
 * Converts HEIC/HEIF files to JPEG for browser compatibility.
 * Returns the original file if it's not HEIC.
 * Uses heic-convert (browser) for reliable conversion; dynamic import avoids SSR.
 */
export async function convertHeicToJpegIfNeeded(file: File): Promise<File> {
  if (!isHeicFile(file)) {
    return file;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const convert = (await import("heic-convert/browser")).default;
    const outputBuffer = await convert({
      buffer,
      format: "JPEG",
      quality: 0.9,
    });

    const blob = new Blob([outputBuffer], { type: "image/jpeg" });
    const newName = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");

    return new File([blob], newName, { type: "image/jpeg" });
  } catch (error) {
    console.error("HEIC conversion failed:", error);
    throw error;
  }
}
