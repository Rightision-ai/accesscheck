/**
 * councilPortalRegistry — resolve a property's local planning authority to a directly-searchable
 * portal (from the shared `council_portals` table). We already know the council from Postcodes.io
 * (properties.local_authority + local_authority_code), so we can go straight to its Idox portal
 * instead of depending on PlanIt.
 *
 * Resolution: GSS code first (exact, indexed), then a normalised-name fallback (seeds are often
 * keyed by name before the GSS code is backfilled). When matched by name, the GSS code is written
 * back so the registry self-heals over time.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type CouncilPortal = {
  id: string;
  lpaCode: string | null;
  lpaName: string;
  software: 'idox' | 'northgate' | 'other';
  baseUrl: string;
  searchPath: string;
};

type Row = Database['public']['Tables']['council_portals']['Row'];

function toPortal(r: Row): CouncilPortal {
  const software = (['idox', 'northgate', 'other'].includes(r.software) ? r.software : 'other') as
    CouncilPortal['software'];
  return {
    id: r.id,
    lpaCode: r.lpa_code,
    lpaName: r.lpa_name,
    software,
    baseUrl: r.base_url.replace(/\/+$/, ''),
    searchPath: r.search_path,
  };
}

/** Strip prefixes/suffixes so "London Borough of Camden" and "Camden Council" both normalise to "camden". */
function normaliseCouncilName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(london borough of|royal borough of|city of|borough of|district|county|metropolitan|unitary|council|authority)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Resolve an enabled portal for the council, or null (caller falls back to PlanWire/PlanIt). */
export async function getPortalForCouncil(
  db: SupabaseClient<Database>,
  lpaCode: string | null | undefined,
  lpaName: string | null | undefined,
): Promise<CouncilPortal | null> {
  // 1. Exact GSS code.
  if (lpaCode) {
    const { data } = await db
      .from('council_portals')
      .select('*')
      .eq('lpa_code', lpaCode)
      .eq('enabled', true)
      .maybeSingle();
    if (data) return toPortal(data);
  }

  // 2. Normalised-name fallback (prefix-stripping is done in app, not SQL).
  if (lpaName) {
    const target = normaliseCouncilName(lpaName);
    const { data } = await db.from('council_portals').select('*').eq('enabled', true);
    const match = (data ?? []).find((r) => normaliseCouncilName(r.lpa_name) === target);
    if (match) {
      // Self-heal: record the GSS code so next time we hit the fast exact path.
      if (lpaCode && !match.lpa_code) await backfillLpaCode(db, match.id, lpaCode);
      return toPortal(match);
    }
  }

  return null;
}

/** Best-effort write-back of a GSS code onto a name-matched registry row. */
export async function backfillLpaCode(
  db: SupabaseClient<Database>,
  id: string,
  lpaCode: string,
): Promise<void> {
  try {
    await db.from('council_portals').update({ lpa_code: lpaCode }).eq('id', id);
  } catch {
    /* non-fatal */
  }
}
