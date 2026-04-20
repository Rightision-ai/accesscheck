import { Case, AccessibilityGrade } from "@/types/dashboard";
import { LEGEND } from "@/lib/accessibility/flowchart";

const VALID_GRADES: ReadonlySet<AccessibilityGrade> = new Set([
  "A+",
  "A-",
  "B+",
  "B-",
  "C",
]);

export function mapSurveyToCase(s: any): Case {
  const grade =
    s.raw_ai_data?.accessibility?.grade ??
    (s.overall_grade && VALID_GRADES.has(s.overall_grade)
      ? (s.overall_grade as AccessibilityGrade)
      : null);
  const accessibilityGrade: AccessibilityGrade | null =
    grade && VALID_GRADES.has(grade) ? (grade as AccessibilityGrade) : null;

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
    thumbnail:
      s.thumbnail_url ||
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80",
    evidence:
      s.raw_ai_data?.evidence ||
      s.raw_ai_data?.photos ||
      s.raw_ai_data?.wizardData?.photos ||
      [],
    description: s.comments || "",
    mlData: s.raw_ai_data || {},
  };
}
