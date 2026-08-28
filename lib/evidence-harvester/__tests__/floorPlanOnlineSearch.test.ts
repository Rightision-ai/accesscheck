import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const mocks = vi.hoisted(() => ({
  lookupPostcode: vi.fn(),
  fetchWithRetry: vi.fn(),
  getPortalForCouncil: vi.fn(),
  persistDiscovery: vi.fn(),
}));

vi.mock('../postcodesService', () => ({
  normalisePostcode(raw: string) {
    const compact = raw.toUpperCase().replace(/\s+/g, '');
    return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
  },
  lookupPostcode: mocks.lookupPostcode,
}));

vi.mock('../http', () => ({ fetchWithRetry: mocks.fetchWithRetry }));
vi.mock('../councilPortalRegistry', () => ({
  getPortalForCouncil: mocks.getPortalForCouncil,
}));
vi.mock('../planningCacheService', () => ({
  addressCacheKey: (uprn: string | null, address: string, postcode: string) =>
    uprn ? `uprn:${uprn}` : `addr:${address.toLowerCase()}|${postcode}`,
  persistDiscovery: mocks.persistDiscovery,
}));

import { findFloorplans } from '../floorPlanFinderService';

describe('findFloorplans online discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lookupPostcode.mockResolvedValue({
      postcode: 'W3 8PD',
      postcode_normalised: 'W3 8PD',
      latitude: 51.5,
      longitude: -0.2,
      local_authority: 'Ealing',
      local_authority_code: 'E09000009',
      region: 'London',
      ward: 'South Acton',
    });
    mocks.getPortalForCouncil.mockResolvedValue(null);
    mocks.fetchWithRetry.mockResolvedValue(
      new Response(JSON.stringify({ records: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    mocks.persistDiscovery.mockResolvedValue(undefined);
  });

  it('performs online discovery again for a repeated address', async () => {
    const db = {} as SupabaseClient<Database>;
    const input = {
      address: 'Garden Studio 27 Gloucester Road London W3 8PD',
      postcode: 'w38pd',
      uprn: '12185751',
    };

    await findFloorplans(input, { db });
    await findFloorplans(input, { db });

    expect(mocks.lookupPostcode).toHaveBeenCalledTimes(2);
    expect(mocks.getPortalForCouncil).toHaveBeenCalledTimes(2);
    expect(mocks.fetchWithRetry).toHaveBeenCalledTimes(4);
    expect(mocks.persistDiscovery).toHaveBeenCalledTimes(2);
  });
});
