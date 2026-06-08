import { convertHeicToJpegIfNeeded } from "./imageUtils";
import { detectFloorPlans, fileToPayload } from "@/lib/detection/client";
import type { DetectionResponse } from "@/lib/detection/types";

export interface FloorPlanAnalysisResult {
  /** true unless upstream rejected the image. Detection service accepts any image, so this is usually true. */
  is_floor_plan?: boolean;
  entrance_level?: {
    value: "GROUND" | "UPPER" | "BASEMENT";
    confidence: number;
  };
  lift?: {
    detected: boolean;
    confidence: number;
  };
  internal_stairs?: {
    detected: boolean;
    confidence: number;
  };
  bedroom_count?: {
    value: number;
    confidence: number;
  };
  external_access?: {
    garden_present: boolean;
    balcony_present: boolean;
    parking_present: boolean;
    confidence: number;
  };
  second_exit?: {
    detected: boolean;
    confidence: number;
  };
  floor_level_number?: number | null;
  stair_geometry?:
    | "Straight"
    | "Quarter Turn"
    | "Half Turn"
    | "Spiral"
    | "Winding"
    | null;
  communal?: {
    communal_door_present: boolean;
    communal_lift_present: boolean;
    communal_lift_count: 0 | 1 | 2 | 3;
  };
  facilities_per_floor?: {
    access_level: string[];
    above: string[];
    below: string[];
  };
  section_measurements?: {
    communal_front_door_steps_count?: number | null;
    communal_front_door_threshold_height_cm?: number | null;
    communal_front_door_opening_width_cm?: number | null;
    property_front_door_steps_count?: number | null;
    property_front_door_threshold_height_cm?: number | null;
    property_front_door_opening_width_cm?: number | null;
    communal_lift_internal_width_cm?: number | null;
    communal_lift_internal_depth_cm?: number | null;
    communal_lift_door_opening_width_cm?: number | null;
    internal_steps_count?: number | null;
    internal_stair_width_cm?: number | null;
    internal_step_height_cm?: number | null;
    second_exit_steps_count?: number | null;
    second_exit_door_opening_width_cm?: number | null;
    hallway_head_on_width_cm?: number | null;
    hallway_turn_width_cm?: number | null;
    door_opening_width_living_room_cm?: number | null;
    door_opening_width_kitchen_cm?: number | null;
    door_opening_width_bed_1_cm?: number | null;
    door_opening_width_bed_2_cm?: number | null;
    door_opening_width_bed_3_cm?: number | null;
    door_opening_width_separate_toilet_cm?: number | null;
    door_opening_width_bathroom_cm?: number | null;
    door_opening_width_balcony_cm?: number | null;
  };
  adaptability?: {
    can_be_adapted?: boolean;
    comments?: string;
  };
  annotations?: Array<{
    type: "door" | "stairs" | "ramp" | "lift" | "second_exit";
    bbox: [number, number, number, number];
    label?: string;
  }>;
}

function toCm(value: unknown, unit: string | null | undefined): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  if (unit === "mm") return n / 10;
  if (unit === "m") return n * 100;
  return n;
}

type SectionMeasurements = NonNullable<FloorPlanAnalysisResult["section_measurements"]>;

function detectionToMeasurements(resp: DetectionResponse): {
  section: SectionMeasurements;
  lift?: NonNullable<FloorPlanAnalysisResult["lift"]>;
  internal_stairs?: NonNullable<FloorPlanAnalysisResult["internal_stairs"]>;
} {
  const section: SectionMeasurements = {};
  let lift: NonNullable<FloorPlanAnalysisResult["lift"]> | undefined;
  let internal_stairs:
    | NonNullable<FloorPlanAnalysisResult["internal_stairs"]>
    | undefined;

  const setSection = (key: keyof SectionMeasurements, cm: number | null) => {
    if (cm !== null) section[key] = cm;
  };

  for (const fv of resp.fields ?? []) {
    const cm = toCm(fv.value, fv.unit);
    switch (fv.field) {
      case "door_width_living_room":
        setSection("door_opening_width_living_room_cm", cm);
        break;
      case "door_width_kitchen":
        setSection("door_opening_width_kitchen_cm", cm);
        break;
      case "door_width_bathroom":
        setSection("door_opening_width_bathroom_cm", cm);
        break;
      case "door_width_bed1":
        setSection("door_opening_width_bed_1_cm", cm);
        break;
      case "door_width_bed2":
        setSection("door_opening_width_bed_2_cm", cm);
        break;
      case "door_width_bed3":
        setSection("door_opening_width_bed_3_cm", cm);
        break;
      case "property_door_opening_width":
        setSection("property_front_door_opening_width_cm", cm);
        break;
      case "stair_width_cm":
        setSection("internal_stair_width_cm", cm);
        break;
      case "hallway_width_head_on_cm":
        setSection("hallway_head_on_width_cm", cm);
        break;
      case "hallway_width_turn_cm":
        setSection("hallway_turn_width_cm", cm);
        break;
      case "internal_steps_count":
        setSection(
          "internal_steps_count",
          typeof fv.value === "number" ? fv.value : null,
        );
        break;
      case "communal_lift_dim_width":
        setSection("communal_lift_internal_width_cm", cm);
        break;
      case "communal_lift_dim_depth":
        setSection("communal_lift_internal_depth_cm", cm);
        break;
      case "has_communal_lift":
        if (fv.value === true) lift = { detected: true, confidence: fv.confidence };
        break;
      case "has_internal_stairs":
        if (fv.value === true)
          internal_stairs = { detected: true, confidence: fv.confidence };
        break;
    }
  }

  return { section, lift, internal_stairs };
}

function mergeAnalysis(
  gemini: FloorPlanAnalysisResult,
  detection: DetectionResponse | null,
): FloorPlanAnalysisResult {
  if (!detection) return gemini;
  const { section, lift, internal_stairs } = detectionToMeasurements(detection);
  const merged: FloorPlanAnalysisResult = { ...gemini };
  merged.section_measurements = {
    ...(gemini.section_measurements ?? {}),
    ...section,
  };
  if (lift?.detected) merged.lift = lift;
  if (internal_stairs?.detected) merged.internal_stairs = internal_stairs;
  return merged;
}

function annotationColor(source: string, fallback?: string | null): string {
  if (fallback) return fallback;
  switch (source) {
    case "yolo": return "#2ed573";
    case "sam": return "#1e90ff";
    case "ocr": return "#ff6b81";
    case "llm": return "#ffa502";
    default: return "#eccc68";
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Bboxes/polygons come back normalised to [0, 1000]; scale to pixel space here
// so we only persist the final annotated raster.
export async function renderAnnotatedFloorPlan(
  imageSrc: string,
  detection: DetectionResponse,
): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0);

  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const strokeWidth = Math.max(2, Math.round(W / 400));
  const fontSize = Math.max(12, Math.round(W / 80));

  for (const ann of detection.annotations ?? []) {
    const color = annotationColor(ann.source, ann.color);
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;

    if (ann.polygon && ann.polygon.length > 0) {
      ctx.beginPath();
      ann.polygon.forEach((pt, i) => {
        const px = (pt[0] / 1000) * W;
        const py = (pt[1] / 1000) * H;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
    } else {
      const x = (ann.bbox.x / 1000) * W;
      const y = (ann.bbox.y / 1000) * H;
      const w = (ann.bbox.w / 1000) * W;
      const h = (ann.bbox.h / 1000) * H;
      ctx.strokeRect(x, y, w, h);
    }

    const labelParts = [ann.label];
    if (ann.value_text) labelParts.push(ann.value_text);
    labelParts.push(`${Math.round(ann.confidence * 100)}%`);
    const text = labelParts.join(" · ");
    ctx.font = `${fontSize}px sans-serif`;
    const textMetrics = ctx.measureText(text);
    const pad = 4;
    const labelX = (ann.bbox.x / 1000) * W;
    const labelY = (ann.bbox.y / 1000) * H;
    const boxW = textMetrics.width + pad * 2;
    const boxH = fontSize + pad * 2;
    const boxY = Math.max(0, labelY - boxH);
    ctx.fillStyle = color;
    ctx.fillRect(labelX, boxY, boxW, boxH);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "top";
    ctx.fillText(text, labelX + pad, boxY + pad);
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

export const analyzeFloorPlan = async (
  file: File,
): Promise<{
  analysis: FloorPlanAnalysisResult;
  raw: DetectionResponse | null;
} | null> => {
  try {
    const converted = await convertHeicToJpegIfNeeded(file);
    const payload = await fileToPayload(converted);

    // Detection first. If it returns a result (200), use it alone and skip Gemini.
    let detection: DetectionResponse | null = null;
    try {
      const detectionResults = await detectFloorPlans([payload]);
      detection = detectionResults[0] ?? null;
    } catch (err) {
      console.warn("YOLO floor-plan detection unavailable:", err);
    }
    if (detection) {
      const analysis = mergeAnalysis({ is_floor_plan: true }, detection);
      return { analysis, raw: detection };
    }

    // Fallback: only call Gemini when detection didn't return a result.
    let geminiResult: FloorPlanAnalysisResult | null = null;
    try {
      const r = await fetch("/api/gemini/floor-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [{ mime_type: payload.mime_type, data: payload.data }],
        }),
      });
      const geminiBody = r.ok ? await r.json() : null;
      geminiResult =
        geminiBody?.success && geminiBody.result
          ? (geminiBody.result as FloorPlanAnalysisResult)
          : null;
    } catch (err) {
      console.warn("Gemini floor-plan unavailable:", err);
    }

    if (!geminiResult) return null;
    return { analysis: mergeAnalysis(geminiResult, null), raw: null };
  } catch (error) {
    console.warn("Floor-plan analysis unavailable:", error);
    return null;
  }
};
