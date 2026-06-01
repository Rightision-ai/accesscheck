import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createAndEnrichProperty } from '@/lib/evidence-harvester/harvestJobService';

// One property runs synchronously (postcode + EPC + listing history complete in a few seconds),
// so the caller can redirect straight to the finished evidence profile.
export const maxDuration = 120;

/** Single-property check. Body: { address, postcode, uprn? } → { propertyId }. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const address = String(body?.address ?? '').trim();
  const postcode = String(body?.postcode ?? '').trim();
  const uprn = body?.uprn ? String(body.uprn).trim() : null;

  if (!address || !postcode) {
    return NextResponse.json({ error: 'Address and postcode are required.' }, { status: 400 });
  }

  try {
    const service = createServiceClient();
    const propertyId = await createAndEnrichProperty(service, user.id, { address, postcode, uprn });
    return NextResponse.json({ propertyId }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
