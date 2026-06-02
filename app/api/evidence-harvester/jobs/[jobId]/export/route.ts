import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase/server';

/** Export the enriched property list for a job as CSV. */
export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: items } = await supabase
    .from('harvest_job_items')
    .select('property_id, row_number')
    .eq('job_id', jobId)
    .order('row_number', { ascending: true });
  const propertyIds = (items ?? []).map((i) => i.property_id).filter((x): x is string => Boolean(x));
  if (propertyIds.length === 0) {
    return new NextResponse('', { headers: csvHeaders(jobId) });
  }

  const [{ data: properties }, { data: statuses }, { data: listings }] = await Promise.all([
    supabase.from('properties').select('*').in('id', propertyIds),
    supabase
      .from('property_assessment_status')
      .select('property_id, evidence_status, overall_confidence, recommended_action')
      .in('property_id', propertyIds),
    supabase
      .from('property_listings')
      .select('property_id, listing_type, event_date, price_gbp, source_name')
      .in('property_id', propertyIds),
  ]);

  const statusMap = new Map((statuses ?? []).map((s) => [s.property_id, s]));
  const listingsByProp = new Map<string, typeof listings>();
  for (const l of listings ?? []) {
    const arr = listingsByProp.get(l.property_id) ?? [];
    arr.push(l);
    listingsByProp.set(l.property_id, arr as never);
  }

  const rows = (properties ?? []).map((p) => {
    const st = statusMap.get(p.id);
    const ls = listingsByProp.get(p.id) ?? [];
    const sales = ls.filter((l) => l.listing_type === 'sale').sort((a, b) => (b.event_date ?? '').localeCompare(a.event_date ?? ''));
    const lastSale = sales[0];
    return {
      property_ref: p.property_ref ?? '',
      address: p.address,
      postcode: p.postcode,
      uprn: p.uprn ?? '',
      uprn_source: p.uprn_source ?? '',
      local_authority: p.local_authority ?? '',
      property_type: p.property_type ?? '',
      last_sold_date: lastSale?.event_date ?? '',
      last_sold_price: lastSale?.price_gbp ?? '',
      times_listed_sale: sales.length,
      times_listed_rent: ls.filter((l) => l.listing_type === 'rent').length,
      listing_source: lastSale?.source_name ?? '',
      evidence_status: st?.evidence_status ?? '',
      overall_confidence: st?.overall_confidence ?? '',
      recommended_action: st?.recommended_action ?? '',
    };
  });

  const csv = Papa.unparse(rows);
  return new NextResponse(csv, { headers: csvHeaders(jobId) });
}

function csvHeaders(jobId: string): HeadersInit {
  return {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="evidence-harvest-${jobId}.csv"`,
  };
}
