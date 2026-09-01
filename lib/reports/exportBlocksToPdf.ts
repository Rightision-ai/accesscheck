import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { drawReportCover, type CoverDetails } from "@/lib/reports/pdfCover";

/**
 * Renders a stack of on-screen cards to an A4 PDF behind the standard cover.
 *
 * Unlike the AHR report — which flows continuously and needs break-zone logic to avoid
 * cutting through a photograph — the pages that use this are built from self-contained
 * blocks. Capturing each `.report-block` separately and starting a new page whenever one
 * does not fit keeps every chart, card and table whole, which is the only thing that
 * matters here. A block taller than a page is the one case that still gets sliced.
 */

/** Marks an element as one unit of the export. Blocks are captured in document order. */
export const REPORT_BLOCK_CLASS = "report-block";

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 10;
const GAP_MM = 5;
/**
 * The width the clone is laid out at before being scaled down to the page.
 *
 * A desktop-ish width rather than A4-at-96-DPI: these blocks are responsive, and capturing
 * them at ~800px would collapse the four-across card rows into stacks that look nothing
 * like the report on screen.
 */
const CAPTURE_WIDTH_PX = 1120;

export async function exportBlocksToPdf(
  container: HTMLElement,
  { fileName, cover }: { fileName: string; cover: CoverDetails },
): Promise<void> {
  const found = Array.from(container.querySelectorAll<HTMLElement>(`.${REPORT_BLOCK_CLASS}`));
  // A caller that marked nothing still gets a sensible export: the whole container as one
  // block, sliced across pages.
  const blocks = found.length > 0 ? found : [container];

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const contentWidthMm = PAGE_WIDTH_MM - MARGIN_MM * 2;
  const contentHeightMm = PAGE_HEIGHT_MM - MARGIN_MM * 2;

  try {
    await document.fonts.ready;
  } catch {
    /* non-blocking: a swapped font is better than no export */
  }

  await drawReportCover(pdf, cover);
  pdf.addPage();

  // No repeated title here: the cover already names the document, and the first block
  // carries its own heading.
  let cursorMm = MARGIN_MM;

  for (const block of blocks) {
    // Rasterise a detached clone at a fixed width so the PDF does not inherit whatever
    // width the viewer's window happens to be.
    const holder = document.createElement("div");
    holder.style.cssText = `position:absolute;left:-9999px;top:0;width:${CAPTURE_WIDTH_PX}px;background:#fff`;
    const clone = block.cloneNode(true) as HTMLElement;
    clone.style.width = "100%";
    clone.style.margin = "0";
    clone.querySelectorAll(".pdf-hide").forEach((element) => element.remove());
    holder.appendChild(clone);
    document.body.appendChild(holder);

    try {
      // Let layout settle before measuring: a height taken too early clips the capture,
      // and the clipping is invisible until someone opens the PDF.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const height = Math.ceil(Math.max(clone.scrollHeight, clone.getBoundingClientRect().height));
      if (height < 8) continue;
      // No windowWidth/windowHeight override: html2canvas would then evaluate media queries
      // at that size while the height above was measured against the real viewport, and the
      // two layouts disagreeing is exactly what cuts a block in half.
      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        width: CAPTURE_WIDTH_PX,
        height,
      });
      if (canvas.width < 2 || canvas.height < 2) continue;

      const blockHeightMm = (canvas.height / canvas.width) * contentWidthMm;
      // A block taller than a page has to be sliced; anything else moves to a fresh page
      // rather than being cut in half.
      if (blockHeightMm > contentHeightMm) {
        let sourceY = 0;
        while (sourceY < canvas.height - 1) {
          const availableMm = MARGIN_MM + contentHeightMm - cursorMm;
          if (availableMm < 20) {
            pdf.addPage();
            cursorMm = MARGIN_MM;
            continue;
          }
          const sliceHeightPx = Math.min(
            canvas.height - sourceY,
            Math.floor((availableMm / contentWidthMm) * canvas.width),
          );
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = sliceHeightPx;
          slice
            .getContext("2d")!
            .drawImage(canvas, 0, sourceY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
          const sliceMm = (sliceHeightPx / canvas.width) * contentWidthMm;
          pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", MARGIN_MM, cursorMm, contentWidthMm, sliceMm);
          cursorMm += sliceMm + GAP_MM;
          sourceY += sliceHeightPx;
        }
      } else {
        if (cursorMm + blockHeightMm > MARGIN_MM + contentHeightMm) {
          pdf.addPage();
          cursorMm = MARGIN_MM;
        }
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.92),
          "JPEG",
          MARGIN_MM,
          cursorMm,
          contentWidthMm,
          blockHeightMm,
        );
        cursorMm += blockHeightMm + GAP_MM;
      }
    } finally {
      holder.remove();
    }
  }

  pdf.save(fileName);
}

/** "1 September 2026" — the form the covers and headers use. */
export function formatCoverDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.valueOf())
    ? iso
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
