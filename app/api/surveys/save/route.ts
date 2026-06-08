import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { buildSurveyData } from "@/lib/surveys/buildSurveyData";

// Allow larger payloads for case data with base64 images
export const maxDuration = 60;

const CATEGORY_SECTION_MAP: Record<string, { section: string; field_reference: string }> = {
  entrance:  { section: 'D', field_reference: 'entrance' },
  hallway:   { section: 'F', field_reference: 'hallway' },
  kitchen:   { section: 'F', field_reference: 'kitchen' },
  bathroom:  { section: 'F', field_reference: 'bathroom' },
  stairs:    { section: 'E', field_reference: 'stairs' },
  garden:    { section: 'E', field_reference: 'garden' },
  floorPlan: { section: 'C', field_reference: 'floor_plan' },
};

export async function POST(req: NextRequest) {
  try {
    let caseData: any;
    try {
      caseData = await req.json();
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      const isTruncated = /unterminated|position|unexpected end/i.test(msg);
      return NextResponse.json(
        {
          error: isTruncated
            ? "Request body too large or truncated. Try fewer or smaller images."
            : `Invalid JSON: ${msg}`,
        },
        { status: 400 }
      );
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const wizardData = caseData.mlData?.wizardData || {};
    const overrides = caseData.mlData?.userOverrides || {};
    const rawAhr = caseData.mlData?.rawAhr || {};

    const surveyData = buildSurveyData(wizardData, overrides, rawAhr, caseData, user.id);

    const isExistingRecord =
      caseData.id && !isNaN(Number(caseData.id));
    let error;
    let newId = caseData.id;

    if (isExistingRecord) {
      const { error: updateError } = await supabase
        .from("surveys")
        .update(surveyData as any)
        .eq("id", Number(caseData.id));
      error = updateError;
    } else {
      const { data: insertedData, error: insertError } = await supabase
        .from("surveys")
        .insert(surveyData as any)
        .select("id")
        .single();

      if (insertedData) {
        newId = insertedData.id.toString();
      }
      error = insertError;
    }

    if (error) {
      console.error("Error saving survey:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // ── Save evidence records to survey_evidences ──
    const surveyId = Number(newId);
    if (surveyId && !isNaN(surveyId)) {
      const categoryPhotos = wizardData.categoryPhotos || {};
      const evidenceRecords: any[] = [];

      for (const [category, urls] of Object.entries(categoryPhotos)) {
        if (!Array.isArray(urls)) continue;
        const mapping = CATEGORY_SECTION_MAP[category];
        if (!mapping) continue;

        for (const url of urls as string[]) {
          if (!url || typeof url !== 'string' || url.startsWith('data:')) continue;
          const fileName = url.split('/').pop() || `${category}-${Date.now()}.jpg`;
          const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
          evidenceRecords.push({
            survey_id: surveyId,
            file_name: fileName,
            file_type: ext.toUpperCase(),
            mime_type: ext === 'png' ? 'image/png' : 'image/jpeg',
            file_url: url,
            section: mapping.section,
            field_reference: mapping.field_reference,
          });
        }
      }

      // Floor plan as evidence (only when AI-approved)
      if (wizardData.floorPlan && wizardData.floorPlanApproved !== false && typeof wizardData.floorPlan === 'string' && !wizardData.floorPlan.startsWith('data:')) {
        const fpMapping = CATEGORY_SECTION_MAP['floorPlan'];
        const isPdf = wizardData.floorPlanIsPdf === true || /\.pdf(\?|$)/i.test(wizardData.floorPlan);
        evidenceRecords.push({
          survey_id: surveyId,
          file_name: wizardData.floorPlan.split('/').pop() || (isPdf ? 'floor-plan.pdf' : 'floor-plan.jpg'),
          file_type: isPdf ? 'PDF' : 'JPEG',
          mime_type: isPdf ? 'application/pdf' : 'image/jpeg',
          file_url: wizardData.floorPlan,
          section: fpMapping.section,
          field_reference: fpMapping.field_reference,
        });
      }

      if (evidenceRecords.length > 0) {
        // Delete existing evidences for this survey (idempotent on re-save)
        await supabase.from('survey_evidences').delete().eq('survey_id', surveyId);

        const { error: evidenceError } = await supabase
          .from('survey_evidences')
          .insert(evidenceRecords);

        if (evidenceError) {
          console.error('Error saving evidence records:', evidenceError);
          // Non-fatal: survey was saved, just evidence records failed
        }
      }

      // Model-produced floor plan detection: archive the raw DetectionResponse
      // alongside an annotated image already uploaded client-side to the
      // floor-plan-detections bucket. Non-fatal on failure.
      const detection = caseData.mlData?.floorPlanDetection;
      const annotatedUrl =
        typeof detection?.annotated_image_url === "string"
          ? detection.annotated_image_url
          : null;
      if (detection && annotatedUrl) {
        try {
          await supabase
            .from("floor_plan_detections")
            .delete()
            .eq("survey_id", surveyId);

          const { error: detectionInsertError } = await supabase
            .from("floor_plan_detections")
            .insert({
              survey_id: surveyId,
              image_url: annotatedUrl,
              image_id: detection.image_id ?? null,
              detection,
              scale_px_per_mm: detection.scale_px_per_mm ?? null,
              scale_confidence: detection.scale_confidence ?? null,
              warnings: detection.warnings ?? [],
            });
          if (detectionInsertError) throw detectionInsertError;
        } catch (detectErr) {
          console.error("Error saving floor plan detection:", detectErr);
        }
      }
    }

    revalidatePath("/");
    if (newId) revalidatePath(`/cases/${newId}`);
    return NextResponse.json({ success: true, id: newId });
  } catch (err) {
    console.error("Save survey API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
