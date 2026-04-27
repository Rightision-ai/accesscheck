import bandDefinitions from "./tables/band-definitions.json";

export type LahrBandId = "A" | "B" | "C" | "D" | "E" | "E+" | "F" | "G";

export type LahrBandDefinition = {
  id: LahrBandId;
  label: string;
  description: string;
  standard: string | null;
  color: string;
  order: number;
  is_sentinel?: boolean;
};

export const LAHR_BANDS: LahrBandDefinition[] =
  bandDefinitions.bands as LahrBandDefinition[];

export const LAHR_BAND_BY_ID: Record<LahrBandId, LahrBandDefinition> =
  Object.fromEntries(LAHR_BANDS.map((b) => [b.id, b])) as Record<
    LahrBandId,
    LahrBandDefinition
  >;

export type DetectionSource = "yolo" | "sam" | "ocr" | "llm" | "user";

export type DetectedValue<T> = {
  value: T;
  unit?: "mm" | "cm" | "m" | "deg" | "percent";
  source: DetectionSource;
  confidence: number;
  evidenceBbox?: [number, number, number, number];
  evidenceImageId?: string;
};

export type CriterionStatus = "pass" | "partial" | "fail" | "unknown";

export type CriterionResult = {
  id: string;
  sectionId: string;
  label: string;
  lahrRef: string;
  status: CriterionStatus;
  cappedBand: LahrBandId | null;
  triggeredRules: {
    n: number;
    capBand: LahrBandId;
    description: string;
    condition: string;
  }[];
  rationale: string;
  inputs: Record<string, unknown>;
};

export type LahrEvaluation = {
  band: LahrBandId;
  criteria: CriterionResult[];
  hardFails: CriterionResult[];
  gTriggered: boolean;
  confidence: number;
};

const BAND_RANK: Record<LahrBandId, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  "E+": 6,
  F: 7,
  G: 99,
};

export function rankOf(band: LahrBandId): number {
  return BAND_RANK[band];
}

/**
 * Numeric overall score persisted as `surveys.compliance_score`. Linear-ish drop from A=100
 * down to F=30, with G as a sentinel for "could not classify".
 */
const BAND_SCORE: Record<LahrBandId, number | null> = {
  A: 100,
  B: 90,
  C: 80,
  D: 70,
  E: 60,
  "E+": 50,
  F: 30,
  G: null,
};

export function lahrBandToScore(band: LahrBandId): number | null {
  return BAND_SCORE[band];
}

export function lowerOf(a: LahrBandId, b: LahrBandId): LahrBandId {
  return rankOf(a) >= rankOf(b) ? a : b;
}

export function higherOf(a: LahrBandId, b: LahrBandId): LahrBandId {
  return rankOf(a) <= rankOf(b) ? a : b;
}
