import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Items for a job, joined to property + assessment status, with optional filters:
 * status, evidence_status, postcode_valid, epc_matched, street_view_available.
 * Joins are done as separate RLS-scoped queries + in-memory merge to avoid PostgREST embed typing.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const fStatus = sp.get('status');
  const fEvidence = sp.get('evidence_status');
  const fPostcodeValid = sp.get('postcode_valid');
  const fEpcMatched = sp.get('epc_matched');
  const fStreetView = sp.get('street_view_available');

  let itemQuery = supabase
    .from('harvest_job_items')
    .select('id, property_id, row_number, status, error_message')
    .eq('job_id', jobId)
    .order('row_number', { ascending: true });
  if (fStatus) itemQuery = itemQuery.eq('status', fStatus);

  const { data: items, error } = await itemQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const propertyIds = (items ?? []).map((i) => i.property_id).filter((x): x is string => Boolean(x));
  if (propertyIds.length === 0) return NextResponse.json({ items: [] });

  const [{ data: properties }, { data: statuses }, { data: sources }] = await Promise.all([
    supabase
      .from('properties')
      .select('id, address, postcode, postcode_normalised, uprn, property_type')
      .in('id', propertyIds),
    supabase
      .from('property_assessment_status')
      .select('property_id, evidence_status, assessment_readiness, overall_confidence, recommended_action')
      .in('property_id', propertyIds),
    supabase
      .from('evidence_sources')
      .select('property_id, source_type')
      .in('property_id', propertyIds),
  ]);

  const propMap = new Map((properties ?? []).map((p) => [p.id, p]));
  const statusMap = new Map((statuses ?? []).map((s) => [s.property_id, s]));
  const epcSet = new Set((sources ?? []).filter((s) => s.source_type === 'epc').map((s) => s.property_id));
  const svSet = new Set(
    (sources ?? []).filter((s) => s.source_type === 'google_street_view').map((s) => s.property_id),
  );

  let merged = (items ?? []).map((item) => {
    const p = item.property_id ? propMap.get(item.property_id) : undefined;
    const st = item.property_id ? statusMap.get(item.property_id) : undefined;
    return {
      item_id: item.id,
      property_id: item.property_id,
      row_number: item.row_number,
      item_status: item.status,
      error_message: item.error_message,
      address: p?.address ?? null,
      postcode: p?.postcode ?? null,
      postcode_valid: Boolean(p?.postcode_normalised),
      uprn: p?.uprn ?? null,
      property_type: p?.property_type ?? null,
      epc_matched: item.property_id ? epcSet.has(item.property_id) : false,
      street_view_available: item.property_id ? svSet.has(item.property_id) : false,
      evidence_status: st?.evidence_status ?? null,
      assessment_readiness: st?.assessment_readiness ?? null,
      overall_confidence: st?.overall_confidence ?? null,
      recommended_action: st?.recommended_action ?? null,
    };
  });

  if (fEvidence) merged = merged.filter((r) => r.evidence_status === fEvidence);
  if (fPostcodeValid != null) merged = merged.filter((r) => r.postcode_valid === (fPostcodeValid === 'true'));
  if (fEpcMatched != null) merged = merged.filter((r) => r.epc_matched === (fEpcMatched === 'true'));
  if (fStreetView != null) merged = merged.filter((r) => r.street_view_available === (fStreetView === 'true'));

  return NextResponse.json({ items: merged });
}
