import { Case, AccessibilityGrade } from "@/types/dashboard";
import { LEGEND } from "@/lib/accessibility/flowchart";

const VALID_GRADES: ReadonlySet<AccessibilityGrade> = new Set([
  "A+",
  "A-",
  "B+",
  "B-",
  "C",
]);

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

export function mapSurveyToCase(s: any): Case {
  const grade =
    s.raw_ai_data?.accessibility?.grade ??
    (s.overall_grade && VALID_GRADES.has(s.overall_grade)
      ? (s.overall_grade as AccessibilityGrade)
      : null);
  const accessibilityGrade: AccessibilityGrade | null =
    grade && VALID_GRADES.has(grade) ? (grade as AccessibilityGrade) : null;
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
    accessibilityGrade,
    accessibilityLabel:
      s.raw_ai_data?.accessibility?.label ??
      (accessibilityGrade ? LEGEND[accessibilityGrade].label : null),
    accessibilityReasons: s.raw_ai_data?.accessibility?.reasons ?? [],
    status: s.status || "Draft",
    source: "AI Assessment",
    date: s.created_at,
    thumbnail: s.thumbnail_url || "",
    evidence:
      s.raw_ai_data?.evidence ||
      s.raw_ai_data?.photos ||
      s.raw_ai_data?.wizardData?.photos ||
      [],
    description: s.comments || "",
    mlData,
  };
}
