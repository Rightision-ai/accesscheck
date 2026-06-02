'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Skeleton } from '@/app/components/property-check/ui';

type AddressOption = {
  address: string;
  uprn: string | null;
  certificateNumber: string | null;
  postcode: string | null;
};

export default function SingleCheckClient() {
  const router = useRouter();
  const [postcode, setPostcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addresses, setAddresses] = useState<AddressOption[]>([]);
  const [postcodeValid, setPostcodeValid] = useState<boolean | null>(null);
  const [manual, setManual] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSearched(false);
    setManual(false);
    if (!postcode.trim()) {
      setError('Please enter a postcode.');
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/evidence-harvester/addresses?postcode=${encodeURIComponent(postcode)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      setPostcodeValid(data.valid);
      setAddresses(data.addresses ?? []);
      setSearched(true);
      // No registered addresses (or EPC unavailable) → offer manual entry.
      if (data.valid && (data.addresses ?? []).length === 0) setManual(true);
    } catch {
      setError('Could not search this postcode. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  async function check(address: string, uprn: string | null) {
    setError(null);
    setChecking(true);
    try {
      const res = await fetch('/api/evidence-harvester/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, postcode, uprn: uprn || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? 'Check failed.');
      const { propertyId } = await res.json();
      router.push(`/properties/${propertyId}/evidence`);
    } catch (err) {
      setError((err as Error).message);
      setChecking(false);
    }
  }

  return (
    <div className="min-h-[72vh] flex items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-extrabold text-slate-900">Check a Property</h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter a postcode, pick the address, and we&apos;ll gather available public evidence —
          postcode geography, EPC, UPRN and sale history. Preliminary check, not a full assessment.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* Step 1 — postcode */}
      <Card>
        <form onSubmit={onSearch} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Postcode <span className="text-rose-500">*</span>
            </label>
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="e.g. NW1 6XE"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>
      </Card>

      {/* Loading skeleton while searching addresses */}
      {searching && (
        <Card>
          <Skeleton className="h-4 w-48 mb-3" />
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Step 2 — invalid postcode */}
      {searched && postcodeValid === false && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          That postcode could not be validated. Check it and try again.
        </div>
      )}

      {/* Step 2 — address list */}
      {searched && postcodeValid && addresses.length > 0 && !manual && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">
              {addresses.length} registered address{addresses.length === 1 ? '' : 'es'} in {postcode.toUpperCase()}
            </h2>
            <button onClick={() => setManual(true)} className="text-xs font-semibold text-primary">
              Not listed? Enter manually
            </button>
          </div>
          <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {addresses.map((a, i) => (
              <li key={`${a.address}-${i}`}>
                <button
                  disabled={checking}
                  onClick={() => check(a.address, a.uprn)}
                  className="w-full text-left py-2.5 px-1 flex items-center justify-between gap-3 hover:bg-slate-50 disabled:opacity-60"
                >
                  <span className="text-sm text-slate-800">{a.address}</span>
                  <span className="text-xs font-bold text-primary shrink-0">Check →</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Step 2 — manual entry fallback */}
      {searched && postcodeValid && manual && (
        <Card>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Enter the address</h2>
          <div className="space-y-3">
            <input
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="e.g. 221B Baker Street"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              disabled={checking || !manualAddress.trim()}
              onClick={() => check(manualAddress, null)}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {checking ? 'Checking…' : 'Check Property'}
            </button>
            {addresses.length > 0 && (
              <button onClick={() => setManual(false)} className="block text-xs font-semibold text-slate-500">
                ← Back to the address list
              </button>
            )}
          </div>
        </Card>
      )}

      <p className="text-sm text-slate-500 text-center">
        Have a list of properties?{' '}
        <Link href="/property-check/upload" className="font-bold text-primary">
          Run a bulk check →
        </Link>
      </p>
      </div>
    </div>
  );
}
