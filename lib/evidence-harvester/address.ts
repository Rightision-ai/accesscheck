/**
 * Address normalisation + similarity used by both the EPC and Land Registry matchers.
 * Public datasets key on address tokens (house/building number + street + postcode), not UPRN,
 * so robust matching is the single biggest accuracy lever in the harvester.
 */

/** Lowercase, strip punctuation, collapse whitespace, expand a few common abbreviations. */
export function normaliseAddress(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\bflat\b/g, 'flat')
    .replace(/\bapartment\b/g, 'flat')
    .replace(/\bapt\b/g, 'flat')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bs+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First number-ish token (house number, flat number) — the strongest discriminator. */
export function extractPrimaryNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/\b(\d+[a-z]?)\b/i);
  return m ? m[1].toLowerCase() : null;
}

function tokenSet(s: string): Set<string> {
  return new Set(normaliseAddress(s).split(' ').filter(Boolean));
}

/**
 * 0–1 similarity between an uploaded address and a candidate. The leading number must agree —
 * a number mismatch caps similarity hard, because "10 X St" and "12 X St" are different homes.
 */
export function addressSimilarity(uploaded: string, candidate: string): number {
  const upN = extractPrimaryNumber(uploaded);
  const candN = extractPrimaryNumber(candidate);
  const numberPenalty = upN && candN && upN !== candN ? 0.5 : 0;

  const a = tokenSet(uploaded);
  const b = tokenSet(candidate);
  if (a.size === 0 || b.size === 0) return 0;

  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const jaccard = inter / (a.size + b.size - inter);

  return Math.max(0, jaccard - numberPenalty);
}
