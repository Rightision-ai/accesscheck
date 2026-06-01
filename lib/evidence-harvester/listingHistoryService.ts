/**
 * ListingHistoryService — sale + rent history for a property, with source attribution. No valuation.
 *
 * Sale history: HM Land Registry Price Paid Data (open, free) via the linked-data API. Each record
 * is a real past transaction (date + price) with a source URL to the Land Registry record.
 *
 * Rental / portal listing history: there is NO free official UK API for portal listings. Rather than
 * scrape (a Terms-of-Service / legal risk), a pluggable provider is supported via the LISTING_PROVIDER
 * env var, OFF by default — when unconfigured, getRentalHistory returns []. A paid provider can be
 * wired into `rentalProvider` later without touching callers.
 */
import { fetchWithRetry } from './http';
import { addressSimilarity } from './address';
import type { ListingRecord } from './types';

const LR_BASE = process.env.LAND_REGISTRY_PPD_BASE_URL || 'https://landregistry.data.gov.uk';

type LrAddress = {
  paon?: string;
  saon?: string;
  street?: string;
  town?: string;
  postcode?: string;
};
type LrTransaction = {
  transactionDate?: string;
  pricePaid?: number;
  transactionId?: string;
  _about?: string;
  propertyAddress?: LrAddress;
};

function lrAddressText(a: LrAddress | undefined): string {
  if (!a) return '';
  return [a.saon, a.paon, a.street, a.town, a.postcode].filter(Boolean).join(' ');
}

/**
 * Past SALE transactions from HM Land Registry Price Paid, matched to the uploaded address.
 * Returns most-recent-first. Throws only on hard failures; an empty array means "no records".
 */
export async function getSaleHistory(
  postcode: string,
  uploadedAddress: string,
): Promise<ListingRecord[]> {
  if (!postcode) return [];
  const url =
    `${LR_BASE}/data/ppi/transaction-record.json` +
    `?propertyAddress.postcode=${encodeURIComponent(postcode.toUpperCase())}&_pageSize=50`;

  const res = await fetchWithRetry(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const body = (await res.json().catch(() => null)) as {
    result?: { items?: LrTransaction[] };
  } | null;
  const items = body?.result?.items ?? [];

  const matched = items
    .map((t) => ({ t, sim: addressSimilarity(uploadedAddress, lrAddressText(t.propertyAddress)) }))
    // When an address is sparse the postcode-scoped result is still useful; keep a low floor.
    .filter(({ sim }) => sim >= 0.2)
    .sort((a, b) => (b.t.transactionDate ?? '').localeCompare(a.t.transactionDate ?? ''));

  return matched.map(({ t, sim }) => ({
    listing_type: 'sale' as const,
    event_date: t.transactionDate ?? null,
    price_gbp: typeof t.pricePaid === 'number' ? t.pricePaid : null,
    status: 'sold',
    source_name: 'HM Land Registry',
    source_url: t._about ?? null,
    raw_metadata: {
      transaction_id: t.transactionId ?? null,
      address: lrAddressText(t.propertyAddress),
      match_confidence: Number(sim.toFixed(2)),
    },
  }));
}

/** Pluggable rental-listing provider. Unconfigured → empty (never scrapes). */
export async function getRentalHistory(
  _postcode: string,
  _uploadedAddress: string,
): Promise<ListingRecord[]> {
  const provider = process.env.LISTING_PROVIDER?.trim();
  if (!provider) return [];
  // Intentionally a no-op stub: a paid provider (e.g. PropertyData/Zoopla partner feed) plugs in
  // here, reading LISTING_PROVIDER_API_KEY, and returns ListingRecord[] with listing_type:'rent'.
  // Left unimplemented so no portal scraping ships by default.
  return [];
}

export async function getListingHistory(
  postcode: string,
  uploadedAddress: string,
): Promise<ListingRecord[]> {
  const [sales, rentals] = await Promise.all([
    getSaleHistory(postcode, uploadedAddress).catch(() => []),
    getRentalHistory(postcode, uploadedAddress).catch(() => []),
  ]);
  return [...sales, ...rentals];
}

export function isRentalProviderConfigured(): boolean {
  return Boolean(process.env.LISTING_PROVIDER?.trim());
}
