import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { lookupPostcode } from '@/lib/evidence-harvester/postcodesService';
import { listAddressesByPostcode } from '@/lib/evidence-harvester/epcService';

export const maxDuration = 30;

/**
 * List registered EPC addresses for a postcode (single-property "pick an address" step).
 * Validates the postcode first, then returns EPC-registered addresses for it.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const postcode = (req.nextUrl.searchParams.get('postcode') ?? '').trim();
  if (!postcode) return NextResponse.json({ error: 'postcode is required' }, { status: 400 });

  const pc = await lookupPostcode(postcode);
  if (!pc) {
    return NextResponse.json({ valid: false, addresses: [] });
  }

  let addresses: Awaited<ReturnType<typeof listAddressesByPostcode>> = [];
  let epcError = false;
  try {
    addresses = await listAddressesByPostcode(pc.postcode_normalised);
  } catch {
    epcError = true; // EPC not configured / unavailable — caller falls back to manual entry
  }

  return NextResponse.json({
    valid: true,
    postcode: pc.postcode_normalised,
    addresses,
    epc_available: !epcError,
  });
}
