import type { jsPDF } from "jspdf";

/**
 * The AccessCheck cover page, shared by every PDF the app exports.
 *
 * One implementation so a property report and an organisation report arrive looking like
 * they came from the same place. The wordmark running up the left edge is a shade lighter
 * than the ground rather than white — it is texture, and at full contrast it would compete
 * with the title it sits beside.
 */

/** Brand green, deepened for a full-bleed page: primary at this area is glaring. */
const GROUND = "#3F8F2A";
const GHOST = "#4E9B39";
const LOGO_SRC = "/assets/logo/PNG/AcessCheck%20-10.png";
/** The white lockup ships at 8779×2283; embedding it whole would add megabytes. */
const LOGO_RENDER_WIDTH_PX = 1400;
const LOGO_ASPECT = 2283 / 8779;

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const EDGE_MM = 16;
/** Left column the vertical wordmark occupies; the title starts to its right. */
const SPINE_MM = 46;

/**
 * jsPDF's built-in fonts are WinAnsi-encoded, and a character outside it does not merely
 * render wrong — it desynchronises the rest of the line's spacing. The arrow is the one
 * that keeps appearing in band pathways, so it is spelled out rather than dropped.
 */
function winAnsi(text: string): string {
  return text
    .replace(/\s*[→⟶➔]\s*/g, " to ")
    .replace(/[^\x20-\xFF]/g, "");
}

export type CoverDetails = {
  /** The document's own name, e.g. "Assessment report" or a property address. */
  title: string;
  /** Who it is for — usually the organisation. */
  subtitle?: string;
  /** Short facts printed under the title: a date range, a case reference. */
  meta?: string[];
  /** The words running up the left edge. */
  spineText?: string;
};

/**
 * Paints the cover onto the CURRENT page. Callers add a page afterwards and carry on —
 * this deliberately does not, so it works both for a fresh document and for one whose
 * first page is already blank.
 */
export async function drawReportCover(
  pdf: jsPDF,
  { title, subtitle, meta = [], spineText = "ACCESSIBILITY REPORT" }: CoverDetails,
): Promise<void> {
  pdf.setFillColor(GROUND);
  pdf.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, "F");

  // Fit the wordmark to the page by measuring rather than guessing, then correcting once:
  // a single scaling pass off a probe measurement lands short, and the error is visible at
  // this size.
  pdf.setFont("helvetica", "bold");
  const targetLength = PAGE_HEIGHT_MM - EDGE_MM * 2;
  let size = 100;
  for (let pass = 0; pass < 2; pass += 1) {
    pdf.setFontSize(size);
    const measured = pdf.getTextWidth(spineText) || targetLength;
    size = size * (targetLength / measured);
  }
  pdf.setFontSize(Math.floor(size));
  pdf.setTextColor(GHOST);
  // Rotated a quarter turn so it reads bottom-to-top. The glyphs then sit to the LEFT of
  // the baseline, so the baseline is pushed in by the line height — otherwise the wordmark
  // is sliced off by the page edge.
  const lineHeight = pdf.getTextDimensions(spineText).h;
  pdf.text(winAnsi(spineText), EDGE_MM + lineHeight * 0.78, PAGE_HEIGHT_MM - EDGE_MM, {
    angle: 90,
    baseline: "bottom",
  });

  const textLeft = SPINE_MM;
  const textWidth = PAGE_WIDTH_MM - textLeft - EDGE_MM;
  pdf.setTextColor("#FFFFFF");

  let cursor = 96;
  if (subtitle) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    for (const line of pdf.splitTextToSize(winAnsi(subtitle).toUpperCase(), textWidth)) {
      pdf.text(line, textLeft, cursor);
      cursor += 6;
    }
    cursor += 6;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(30);
  for (const line of pdf.splitTextToSize(winAnsi(title), textWidth)) {
    pdf.text(line, textLeft, cursor);
    cursor += 12;
  }

  if (meta.length > 0) {
    cursor += 4;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    for (const line of meta) {
      for (const wrapped of pdf.splitTextToSize(winAnsi(line), textWidth)) {
        pdf.text(wrapped, textLeft, cursor);
        cursor += 6;
      }
    }
  }

  const logo = await loadLogo();
  if (logo) {
    const width = 74;
    // Clear of the spine, and low on the page: sitting over the vertical wordmark made the
    // lockup read as part of it.
    pdf.addImage(
      logo,
      "PNG",
      SPINE_MM,
      PAGE_HEIGHT_MM - 20 - width * LOGO_ASPECT,
      width,
      width * LOGO_ASPECT,
    );
  }
}

/**
 * The white lockup as a data URI, redrawn small.
 *
 * A failure here is not worth losing the export over — the cover simply goes out without
 * the logo — so this resolves to null rather than throwing.
 */
async function loadLogo(): Promise<string | null> {
  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = LOGO_SRC;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("logo failed to load"));
    });
    const canvas = document.createElement("canvas");
    canvas.width = LOGO_RENDER_WIDTH_PX;
    canvas.height = Math.round(LOGO_RENDER_WIDTH_PX * LOGO_ASPECT);
    const context = canvas.getContext("2d");
    if (!context) return null;
    // Composited onto the cover's own ground rather than left transparent: jsPDF renders a
    // PNG's alpha unevenly, and the white lockup came out washed against the green.
    context.fillStyle = GROUND;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
