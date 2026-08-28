import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  findFloorplans,
  type FindFloorplansDeps,
  type FloorplanResult,
} from './floorPlanFinderService';

type Db = SupabaseClient<Database>;

export type PlanningEvidenceProperty = {
  id: string;
  address: string;
  postcode: string;
  uprn: string | null;
  latitude: number | null;
  longitude: number | null;
  address_latitude: number | null;
  address_longitude: number | null;
};

type FindFloorplans = (
  input: Parameters<typeof findFloorplans>[0],
  deps: FindFloorplansDeps,
) => Promise<FloorplanResult>;

/**
 * Perform a fresh online planning search and materialise the completed result onto the property.
 * Stored discoveries never replace or short-circuit this search.
 */
export async function syncPropertyPlanningEvidence(
  db: Db,
  userId: string,
  property: PlanningEvidenceProperty,
  options: { find?: FindFloorplans } = {},
): Promise<FloorplanResult> {
  const find = options.find ?? findFloorplans;
  const result = await find(
    {
      address: property.address,
      postcode: property.postcode,
      uprn: property.uprn,
      lat: property.address_latitude ?? property.latitude,
      lon: property.address_longitude ?? property.longitude,
    },
    { db },
  );

  const { error: deleteError } = await db
    .from('evidence_sources')
    .delete()
    .eq('property_id', property.id)
    .eq('source_type', 'planning_portal');
  if (deleteError) throw new Error(`Could not replace planning evidence: ${deleteError.message}`);

  const rows: Database['public']['Tables']['evidence_sources']['Insert'][] = [
    ...result.plans.map((plan) => ({
      user_id: userId,
      property_id: property.id,
      source_type: 'planning_portal',
      source_name: plan.council,
      source_url: plan.url,
      external_reference: plan.application,
      raw_metadata_json: {
        kind: 'plan',
        description: plan.description,
        match_score: plan.matchScore,
        council: plan.council,
        docs_url: plan.docsUrl,
        exact: plan.exact,
      },
      confidence: plan.matchScore > 0 ? Math.min(0.9, plan.matchScore / 100) : null,
    })),
    ...result.applications.map((application) => ({
      user_id: userId,
      property_id: property.id,
      source_type: 'planning_portal',
      source_name: application.council,
      source_url: application.url,
      external_reference: application.application,
      raw_metadata_json: {
        kind: 'application',
        description: application.description,
        match_score: application.matchScore,
        council: application.council,
        extracted: application.extracted,
        exact: application.exact,
      },
      confidence:
        application.matchScore > 0 ? Math.min(0.9, application.matchScore / 100) : null,
    })),
  ];

  if (rows.length > 0) {
    const { error: insertError } = await db.from('evidence_sources').insert(rows);
    if (insertError) throw new Error(`Could not save planning evidence: ${insertError.message}`);
  }

  return result;
}
