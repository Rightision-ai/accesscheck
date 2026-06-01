import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findFloorplans } from '@/lib/evidence-harvester/floorPlanFinderService';

// Scrapes external council portals — must run on the Node runtime, never the edge/browser.
export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * On-demand: find candidate floor-plan PDFs for a property from council planning portals, using the
 * property's stored (selected) address + postcode. Persisted idempotently as `planning_portal`
 * evidence_sources so the property page can render them.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: property } = await supabase
    .from('properties')
    .select('id, address, postcode, latitude, longitude')
    .eq('id', propertyId)
    .single();
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  let result;
  try {
    result = await findFloorplans({
      address: property.address,
      postcode: property.postcode,
      lat: property.latitude,
      lon: property.longitude,
    });
  } catch (err) {
    return NextResponse.json({ error: `Floorplan search failed: ${(err as Error).message}` }, { status: 502 });
  }

  // Idempotent: clear previous planning_portal evidence for this property, then insert fresh.
  await supabase.from('evidence_sources').delete().eq('property_id', propertyId).eq('source_type', 'planning_portal');

  const rows = [
    // Auto-extracted plan/elevation PDFs.
    ...result.plans.map((p) => ({
      user_id: user.id,
      property_id: propertyId,
      source_type: 'planning_portal',
      source_name: p.council,
      source_url: p.url,
      external_reference: p.application,
      raw_metadata_json: { kind: 'plan', description: p.description, match_score: p.matchScore, council: p.council, docs_url: p.docsUrl } as never,
      confidence: p.matchScore > 0 ? Math.min(0.9, p.matchScore / 100) : null,
    })),
    // Candidate planning-application pages (works for any council — direct link to view docs manually).
    ...result.applications.map((a) => ({
      user_id: user.id,
      property_id: propertyId,
      source_type: 'planning_portal',
      source_name: a.council,
      source_url: a.url,
      external_reference: a.application,
      raw_metadata_json: { kind: 'application', description: a.description, match_score: a.matchScore, council: a.council, extracted: a.extracted } as never,
      confidence: a.matchScore > 0 ? Math.min(0.9, a.matchScore / 100) : null,
    })),
  ];
  if (rows.length > 0) await supabase.from('evidence_sources').insert(rows);

  return NextResponse.json({
    planCount: result.plans.length,
    applicationCount: result.applications.length,
    plans: result.plans,
    applications: result.applications,
  });
}
