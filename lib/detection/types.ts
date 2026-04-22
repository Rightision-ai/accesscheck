// Mirrors the Pydantic schemas in services/detection/app/schemas.py.
// Keep these in sync — if you add a field server-side, add it here too.

import type { DetectedValue } from "@/lib/accessibility/lahr/types";

export type ImageKind = "floor_plan" | "photo";

export type DetectionBBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DetectionAnnotation = {
  object_class: string;
  label: string;
  value_text?: string | null;
  bbox: DetectionBBox;
  polygon?: number[][] | null;
  confidence: number;
  criterion_id?: string | null;
  color?: string | null;
  source: "yolo" | "sam" | "ocr" | "llm" | "user";
};

export type DetectionFieldValue = {
  field: string;
  value: string | number | boolean | null;
  unit?: "mm" | "cm" | "m" | "deg" | "percent" | null;
  source: "yolo" | "sam" | "ocr" | "llm" | "user";
  confidence: number;
  evidence_bbox?: DetectionBBox | null;
  evidence_image_id?: string | null;
};

export type DetectionResponse = {
  kind: ImageKind;
  image_id?: string | null;
  scale_px_per_mm?: number | null;
  scale_confidence: number;
  annotations: DetectionAnnotation[];
  fields: DetectionFieldValue[];
  raw_ocr?: unknown[];
  warnings: string[];
};

export type DetectionState = {
  floorPlans: DetectionResponse[];
  photos: DetectionResponse[];
};

export function toDetectedValue(fv: DetectionFieldValue): DetectedValue<unknown> {
  return {
    value: fv.value,
    unit: fv.unit ?? undefined,
    source: fv.source,
    confidence: fv.confidence,
    evidenceBbox: fv.evidence_bbox
      ? [fv.evidence_bbox.x, fv.evidence_bbox.y, fv.evidence_bbox.w, fv.evidence_bbox.h]
      : undefined,
    evidenceImageId: fv.evidence_image_id ?? undefined,
  };
}

export function mergeFieldValues(
  responses: DetectionResponse[],
): Record<string, DetectedValue<unknown>> {
  const merged: Record<string, DetectedValue<unknown>> = {};
  for (const resp of responses) {
    for (const fv of resp.fields) {
      const existing = merged[fv.field];
      if (!existing || fv.confidence > existing.confidence) {
        merged[fv.field] = toDetectedValue(fv);
      }
    }
  }
  return merged;
}
