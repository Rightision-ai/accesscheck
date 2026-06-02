import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/actions';
import { redirect } from 'next/navigation';
import SurveyPriorityClient, { type SurveyRow } from './SurveyPriorityClient';

export default async function SurveyPriorityPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: statuses } = await supabase
    .from('property_assessment_status')
    .select('property_id, evidence_status, assessment_readiness, overall_confidence, recommended_action');

  const propertyIds = (statuses ?? []).map((s) => s.property_id);
  const { data: properties } = propertyIds.length
    ? await supabase
        .from('properties')
        .select('id, address, postcode, property_type, created_at')
        .in('id', propertyIds)
    : { data: [] as { id: string; address: string; postcode: string; property_type: string | null; created_at: string }[] };
  const propMap = new Map((properties ?? []).map((p) => [p.id, p]));

  const rows: SurveyRow[] = (statuses ?? [])
    .map((s) => {
      const p = propMap.get(s.property_id);
      return {
        property_id: s.property_id,
        address: p?.address ?? '—',
        postcode: p?.postcode ?? '',
        property_type: p?.property_type ?? null,
        created_at: p?.created_at ?? null,
        evidence_status: s.evidence_status,
        overall_confidence: s.overall_confidence,
        recommended_action: s.recommended_action,
      };
    })
    // Default sort: newest first (date added).
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

  return <SurveyPriorityClient initialRows={rows} />;
}
