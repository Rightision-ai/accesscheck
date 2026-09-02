import { Case } from "@/types/dashboard";
import { normalizeAssessmentStatus } from "@/lib/assessments/status";

/**
 * Merges survey DB columns (stored in mm) into mlData so the report displays mm values.
 * Survey columns override rawAhr/wizardData which may have legacy cm values.
 */
function mergeSurveyWidthsIntoMlData(mlData: Record<string, any>, s: any): void {
  const rawAhr = mlData.rawAhr
    ? (JSON.parse(JSON.stringify(mlData.rawAhr)) as Record<string, any>)
    : {};
  const wizardData = mlData.wizardData ? { ...mlData.wizardData } : {};

  const mmFields: Array<{
    surveyKey: keyof typeof s;
    rawAhrPath?: string[];
    wizardKey?: string;
  }> = [
    { surveyKey: "communal_door_opening_width", rawAhrPath: ["external_access", "communal_front_door", "width_cm", "value"], wizardKey: "communalDoorWidth" },
    { surveyKey: "communal_lift_dim_width", rawAhrPath: ["external_access", "lift_details", "internal_dimensions_cm", "width"], wizardKey: "communalLiftWidth" },
    { surveyKey: "communal_lift_dim_depth", rawAhrPath: ["external_access", "lift_details", "internal_dimensions_cm", "depth"], wizardKey: "communalLiftDepth" },
    { surveyKey: "communal_lift_door_width", rawAhrPath: ["external_access", "lift_details", "door_clear_opening_cm", "value"], wizardKey: "communalLiftDoorWidth" },
    { surveyKey: "property_door_opening_width", rawAhrPath: ["external_access", "property_front_door", "width_cm", "value"], wizardKey: "propertyDoorWidth" },
    { surveyKey: "stair_width_cm", rawAhrPath: ["vertical_circulation", "internal_stairs", "min_width_cm", "value"], wizardKey: "stairWidth" },
    { surveyKey: "second_exit_door_width", rawAhrPath: ["context_amenities", "second_exit", "opening_width_cm"] },
    { surveyKey: "hallway_width_head_on_cm", wizardKey: "hallwayWidthHeadOn" },
    { surveyKey: "hallway_width_turn_cm", wizardKey: "hallwayWidthTurn" },
  ];

  for (const { surveyKey, rawAhrPath, wizardKey } of mmFields) {
    const val = s[surveyKey];
    if (val == null) continue;

    if (rawAhrPath) {
      let obj: any = rawAhr;
      for (let i = 0; i < rawAhrPath.length - 1; i++) {
        const key = rawAhrPath[i];
        if (!obj[key]) obj[key] = {};
        obj = obj[key];
      }
      obj[rawAhrPath[rawAhrPath.length - 1]] = val;
    }
    if (wizardKey) {
      wizardData[wizardKey] = String(val);
    }
  }

  mlData.rawAhr = rawAhr;
  mlData.wizardData = { ...wizardData };
}

/**
 * Photo URLs for a survey row. `categoryPhotos` is the wizard's authoritative store —
 * `photos` is only a flattened mirror of it and can persist as an empty array, so an
 * `||` chain alone silently loses every image. Each candidate is only accepted when it
 * actually holds something.
 */
function resolveEvidence(s: { raw_ai_data?: Record<string, unknown> | null }): string[] {
  const rawAiData = (s.raw_ai_data ?? {}) as Record<string, unknown>;
  const wizardData = (rawAiData.wizardData ?? {}) as Record<string, unknown>;
  const categoryPhotos = (wizardData.categoryPhotos ?? {}) as Record<string, unknown>;
  const candidates: unknown[] = [
    rawAiData.evidence,
    rawAiData.photos,
    wizardData.photos,
    Object.values(categoryPhotos).flat(),
  ];
  for (const candidate of candidates) {
    const list = Array.isArray(candidate) ? candidate.filter(Boolean) : [];
    if (list.length > 0) return list as string[];
  }
  return [];
}

export function mapSurveyToCase(s: any): Case {
  const clonedRawAiData: Record<string, any> = s.raw_ai_data
    ? (JSON.parse(JSON.stringify(s.raw_ai_data)) as Record<string, any>)
    : {};
  const mlData: Case["mlData"] = {
    ...clonedRawAiData,
    imageCount: Number(clonedRawAiData.imageCount ?? 0),
    wizardData: clonedRawAiData.wizardData ?? {},
    surveyUpdatedAt:
      (s as { updated_at?: string | null }).updated_at ?? null,
    // The persisted survey row is the only shape `classifyLahr` understands —
    // wizardData uses camelCase keys and won't drive any rules.
    surveyRow: s,
  };

  mergeSurveyWidthsIntoMlData(mlData, s);

  return {
    id: s.id.toString(),
    applicantName: s.inspector_name || null,
    address:
      [s.door_number, s.street_number, s.building_name, s.street]
        .filter(Boolean)
        .join(" ") || "Address Pending",
    city: s.city || null,
    postcode: s.postcode || "",
    phoneNumber:
      s.inspector_phone || s.raw_ai_data?.wizardData?.phoneNumber || undefined,
    assessmentDate: s.inspection_date || s.created_at,
    aiScore: s.compliance_score ? Number(s.compliance_score) : null,
    status: normalizeAssessmentStatus(s.status),
    source: "AI Assessment",
    date: s.created_at,
    thumbnail: s.thumbnail_url || "",
    evidence: resolveEvidence(s),
    description: s.comments || "",
    mlData,
  };
}
