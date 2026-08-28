import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { storePlanDocsInBackground } from '@/lib/evidence-harvester/planningCacheService';
import { normalisePostcode } from '@/lib/evidence-harvester/postcodesService';
import { syncPropertyPlanningEvidence } from '@/lib/evidence-harvester/propertyPlanningEvidenceService';

// Scrapes external council portals — must run on the Node runtime, never the edge/browser.
export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * On-demand: find candidate floor-plan PDFs for a property from council planning portals, using the
 * property's stored (selected) EXACT address + postcode (and address-level coordinates when geocoded).
 * Persisted idempotently as `planning_portal` evidence_sources so the property page can render them.
 * Every request performs a fresh online discovery.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: property } = await supabase
    .from('properties')
    .select('id, address, postcode, uprn, latitude, longitude, address_latitude, address_longitude')
    .eq('id', propertyId)
    .single();
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  // Shared planning records are not user-scoped, so they are written with the service-role client.
  const service = createServiceClient();

  let result;
  try {
    result = await syncPropertyPlanningEvidence(service, user.id, property);
  } catch (err) {
    return NextResponse.json({ error: `Floorplan search failed: ${(err as Error).message}` }, { status: 502 });
  }

  // Cache the actual PDF bytes in the background so repeat opens don't re-hit the council session.
  after(() => storePlanDocsInBackground(service, normalisePostcode(property.postcode)));

  return NextResponse.json({
    planCount: result.plans.length,
    applicationCount: result.applications.length,
    plans: result.plans,
    applications: result.applications,
  });
}
