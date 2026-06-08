// Render the first page of a PDF to a JPEG File so the floor-plan analysis
// pipeline (Gemini + detection) — which only handles raster images — can analyse
// PDF floor plans (e.g. council planning documents).
//
// pdfjs-dist touches browser-only globals (DOMMatrix, etc.) at module-eval time,
// so it must NOT be imported at the top level (that breaks SSR/prerender of the
// wizard page). We lazy-import it inside the function so it only loads in the
// browser when a PDF is actually processed.

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      return lib;
    });
  }
  return pdfjsPromise;
}

/**
 * Render the first page of a PDF to a JPEG File at ~2x scale for legible detail.
 * Throws if the PDF can't be parsed/rendered.
 */
export async function renderPdfFirstPageToJpeg(
  file: File | Blob,
  scale = 2,
): Promise<File> {
  const pdfjsLib = await getPdfjs();
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas 2d context");
    // White background so transparent PDFs don't render black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.9,
      ),
    );
    return new File([blob], "floor-plan-page1.jpg", { type: "image/jpeg" });
  } finally {
    await loadingTask.destroy();
  }
}
