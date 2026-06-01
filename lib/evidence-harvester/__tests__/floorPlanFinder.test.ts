import { describe, it, expect, vi, afterEach } from 'vitest';
import { addressScore, getAdapter, filterPlans } from '../floorPlanFinderService';

afterEach(() => vi.restoreAllMocks());

describe('addressScore', () => {
  it('scores a building+street match high (unit number barely counts)', () => {
    const s = addressScore('237 Sarsen House, Middle Road', 'Sarsen House, Middle Road, London', 'W7');
    expect(s).toBeGreaterThan(60);
  });

  it('scores an unrelated address low', () => {
    const s = addressScore('237 Sarsen House, Middle Road', '5 Cherry Tree Lane, Bristol', 'W7');
    expect(s).toBeLessThan(35);
  });

  it('strips the postcode so it does not inflate the score', () => {
    const s = addressScore('10 Downing Street SW1A 2AA', 'Somewhere Else SW1A 2AA', null);
    expect(s).toBeLessThan(35); // only the shared (stripped) postcode — no real overlap
  });
});

describe('getAdapter', () => {
  it('routes Idox /online-applications/ URLs to the idox adapter', () => {
    expect(getAdapter('https://planning.leeds.gov.uk/online-applications/foo')?.name).toBe('idox');
  });
  it('routes Northgate /PlanningExplorer/ URLs to the northgate adapter', () => {
    expect(getAdapter('https://pa.example.gov.uk/PlanningExplorer/x.aspx')?.name).toBe('northgate');
  });
  it('returns null for an unknown portal', () => {
    expect(getAdapter('https://weird-custom-portal.gov.uk/apps/123')).toBeNull();
  });
});

describe('filterPlans', () => {
  it('keeps plan/elevation docs and drops the rest', () => {
    const docs = [
      { description: 'Proposed Floor Plan', url: 'a.pdf' },
      { description: 'Decision Notice', url: 'b.pdf' },
      { description: 'Existing and Proposed Elevations', url: 'c.pdf' },
      { description: 'Application Form', url: 'd.pdf' },
    ];
    const plans = filterPlans(docs);
    expect(plans.map((p) => p.url)).toEqual(['a.pdf', 'c.pdf']);
  });
});

describe('Idox adapter.extract (parsing, mocked fetch)', () => {
  it('extracts PDF anchors with their row text as the description', async () => {
    const html = `
      <table>
        <tr><td>Proposed Floor Plan</td><td><a href="/online-applications/files/ABC/proposed.pdf">View</a></td></tr>
        <tr><td>Location Plan</td><td><a href="/online-applications/files/DEF/location.pdf">View</a></td></tr>
        <tr><td>Some page</td><td><a href="/online-applications/info.html">Info</a></td></tr>
      </table>`;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(html, { status: 200 })));

    const adapter = getAdapter('https://planning.leeds.gov.uk/online-applications/docs')!;
    const docs = await adapter.extract('https://planning.leeds.gov.uk/online-applications/docs');
    expect(docs).toHaveLength(2); // two PDFs, the .html anchor ignored
    expect(docs[0].description).toContain('Proposed Floor Plan');
    expect(docs[0].url).toBe('https://planning.leeds.gov.uk/online-applications/files/ABC/proposed.pdf');

    const plans = filterPlans(docs);
    expect(plans.map((p) => p.description)).toEqual(
      expect.arrayContaining([expect.stringContaining('Proposed Floor Plan'), expect.stringContaining('Location Plan')]),
    );
  });
});
