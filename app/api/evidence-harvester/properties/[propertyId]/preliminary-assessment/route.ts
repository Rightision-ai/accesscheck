import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { recomputePropertyStatus } from '@/lib/evidence-harvester/harvestJobService';

export const maxDuration = 120;

/** Re-run enrichment + status computation for a single property on demand. */
export async function POST(_req: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Authorize via RLS-scoped read before handing the id to the service-role worker.
  const { data: property } = await supabase.from('properties').select('id').eq('id', propertyId).single();
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  after(async () => {
    const service = createServiceClient();
    try {
      await recomputePropertyStatus(service, user.id, propertyId);
    } catch (err) {
      console.error(`[evidence-harvester] preliminary assessment failed for ${propertyId}:`, (err as Error).message);
    }
  });

  return NextResponse.json({ status: 'processing', propertyId }, { status: 202 });
}
