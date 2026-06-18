/**
 * addressUtils — address tokenisation, similarity scoring, and EXACT-address matching for the
 * floor-plan finder. A postcode contains many addresses, so floor-plan results must be tied to the
 * selected property's exact door number + street, not just its postcode.
 *
 * `addressScore` is the building/street-weighted similarity used for ranking. `isExactAddressMatch`
 * is the strict gate that decides whether a planning application actually belongs to THIS property
 * (door number must match) vs. merely being nearby.
 */

// ---------------------------------------------------------------------------
// Tokenisation (building/street weighted; the unit number barely counts for scoring)
// ---------------------------------------------------------------------------
const ABBREV: Record<string, string> = {
  rd: 'road', st: 'street', ave: 'avenue', av: 'avenue', ln: 'lane', cl: 'close',
  ct: 'court', dr: 'drive', ho: 'house', hse: 'house', apt: 'apartment', fl: 'flat',
};
const GENERIC = new Set([
  'road', 'street', 'avenue', 'lane', 'close', 'court', 'drive', 'house', 'apartment',
  'flat', 'the', 'of', 'at', 'land', 'to', 'adjacent', 'former', 'site', 'london', 'england', 'uk',
]);
const UK_POSTCODE = /\b[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}\b/gi;

function addrTokens(s: string, dropOutcode?: string | null): string[] {
  let t = s.toLowerCase().replace(UK_POSTCODE, ' ');
  if (dropOutcode) t = t.replace(new RegExp(`\\b${dropOutcode.toLowerCase()}\\b`, 'g'), ' ');
  t = t.replace(/[^a-z0-9 ]/g, ' ');
  return t.split(/\s+/).filter(Boolean).map((w) => ABBREV[w] ?? w);
}

/** Building/street-weighted similarity, 0–100. Generic words (road, street…) count less. */
export function addressScore(target: string, candidate: string, outcode?: string | null): number {
  const t = addrTokens(target, outcode);
  const c = new Set(addrTokens(candidate, outcode));
  const tWords = t.filter((w) => !/^\d+$/.test(w));
  const tNums = new Set(t.filter((w) => /^\d+$/.test(w)));
  const cNums = new Set([...c].filter((w) => /^\d+$/.test(w)));
  if (tWords.length === 0) return 0;
  let num = 0, den = 0;
  for (const w of new Set(tWords)) {
    const wt = GENERIC.has(w) ? 0.4 : 1.0;
    den += wt;
    if (c.has(w)) num += wt;
  }
  let score = den ? (num / den) * 100 : 0;
  if (tNums.size && [...tNums].some((n) => cNums.has(n))) score = Math.min(100, score + 10);
  return Math.round(score * 10) / 10;
}

// ---------------------------------------------------------------------------
// Exact-address matching (door number + street)
// ---------------------------------------------------------------------------

/** Numeric tokens in an address (after stripping the postcode). The door number is normally first. */
function numberTokens(s: string, outcode?: string | null): string[] {
  return addrTokens(s, outcode).filter((w) => /^\d+$/.test(w));
}

/**
 * The property's door/house number: the first standalone number once the postcode is removed.
 * Returns null for name-only addresses (e.g. "Rose Cottage, …") where we can't gate on a number.
 */
export function extractDoorNumber(address: string, outcode?: string | null): string | null {
  const nums = numberTokens(address, outcode);
  return nums[0] ?? null;
}

/**
 * True only when the candidate application plausibly belongs to the EXACT target address: a building
 * number must match AND the street must overlap enough to exclude same-number addresses on a different
 * street.
 *
 * We compare the FULL set of numbers in each address (not just the first), so "Flat 2, 14 High Street"
 * matches a council application addressed "14 High Street" on the building number 14 — and a block
 * application "12-16 High Street" (tokens 12,16) still matches its own units. When the target has no
 * parseable number (e.g. "Rose Cottage") we fall back to a strong street/name similarity.
 */
export function isExactAddressMatch(
  target: string,
  candidate: string,
  outcode?: string | null,
  opts: { streetThreshold?: number; nameThreshold?: number } = {},
): boolean {
  const { streetThreshold = 45, nameThreshold = 80 } = opts;
  const targetNums = new Set(numberTokens(target, outcode));
  const score = addressScore(target, candidate, outcode);
  if (targetNums.size === 0) return score >= nameThreshold; // name-only address — lean on similarity
  const candNums = new Set(numberTokens(candidate, outcode));
  const numberMatch = [...targetNums].some((n) => candNums.has(n));
  return numberMatch && score >= streetThreshold;
}
