import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalisePostcode, lookupPostcode, bulkLookupPostcodes } from '../postcodesService';

afterEach(() => vi.restoreAllMocks());

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => handler(url, init)));
}

describe('normalisePostcode', () => {
  it('uppercases and inserts the single space before the inward code', () => {
    expect(normalisePostcode('sw1a2aa')).toBe('SW1A 2AA');
    expect(normalisePostcode(' nw1 6xe ')).toBe('NW1 6XE');
  });
});

describe('lookupPostcode', () => {
  it('returns a normalised result on 200', async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({
          result: {
            postcode: 'SW1A 2AA',
            latitude: 51.5,
            longitude: -0.12,
            admin_district: 'Westminster',
            codes: { admin_district: 'E09000033' },
            region: 'London',
            admin_ward: 'St Jamess',
          },
        }),
        { status: 200 },
      ),
    );
    const res = await lookupPostcode('sw1a 2aa');
    expect(res?.local_authority).toBe('Westminster');
    expect(res?.local_authority_code).toBe('E09000033');
    expect(res?.latitude).toBe(51.5);
  });

  it('returns null on 404 (invalid/terminated)', async () => {
    mockFetch(() => new Response('', { status: 404 }));
    expect(await lookupPostcode('INVALID')).toBeNull();
  });
});

describe('bulkLookupPostcodes', () => {
  it('chunks into requests of <=100 and keys by normalised postcode', async () => {
    const calls: number[] = [];
    mockFetch((_url, init) => {
      const body = JSON.parse((init?.body as string) ?? '{}');
      calls.push(body.postcodes.length);
      return new Response(
        JSON.stringify({
          result: body.postcodes.map((q: string) => ({
            query: q,
            result: { postcode: q, latitude: 1, longitude: 2, admin_district: 'X', region: 'R', admin_ward: 'W' },
          })),
        }),
        { status: 200 },
      );
    });

    const input = Array.from({ length: 150 }, (_, i) => `AA${i} 1AA`);
    const map = await bulkLookupPostcodes(input);
    expect(calls).toEqual([100, 50]); // two chunks
    expect(map.size).toBe(150);
  });
});
