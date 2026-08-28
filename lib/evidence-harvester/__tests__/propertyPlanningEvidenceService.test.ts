import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { syncPropertyPlanningEvidence } from '../propertyPlanningEvidenceService';

function evidenceDb() {
  const inserted: Database['public']['Tables']['evidence_sources']['Insert'][] = [];
  const deletedFilters: [string, unknown][] = [];
  const db = {
    from(table: string) {
      expect(table).toBe('evidence_sources');
      return {
        delete() {
          const chain = {
            eq(column: string, value: unknown) {
              deletedFilters.push([column, value]);
              return chain;
            },
          };
          return chain;
        },
        async insert(rows: Database['public']['Tables']['evidence_sources']['Insert'][]) {
          inserted.push(...rows);
          return { error: null };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;

  return { db, inserted, deletedFilters };
}

const property = {
  id: 'property-2',
  address: 'Garden Studio 27 Gloucester Road London W3 8PD',
  postcode: 'w38pd',
  uprn: '12185751',
  latitude: 51.5,
  longitude: -0.2,
  address_latitude: 51.51,
  address_longitude: -0.21,
};

describe('syncPropertyPlanningEvidence', () => {
  it('attaches freshly discovered plans to a repeated property record', async () => {
    const { db, inserted, deletedFilters } = evidenceDb();
    const find = vi.fn(async () => ({
      council: 'Ealing',
      plans: [
        {
          description: 'Proposed floor plan',
          url: 'https://planning.example/plan.pdf',
          docsUrl: 'https://planning.example/application/documents',
          application: 'APP-1',
          council: 'Ealing',
          matchScore: 100,
          exact: true,
        },
      ],
      applications: [
        {
          description: 'Alterations',
          url: 'https://planning.example/application/documents',
          application: 'APP-1',
          council: 'Ealing',
          matchScore: 100,
          extracted: true,
          exact: true,
        },
      ],
    }));

    const result = await syncPropertyPlanningEvidence(db, 'user-1', property, { find });

    expect(result.plans).toHaveLength(1);
    expect(find).toHaveBeenCalledWith(
      {
        address: property.address,
        postcode: property.postcode,
        uprn: property.uprn,
        lat: property.address_latitude,
        lon: property.address_longitude,
      },
      { db },
    );
    expect(deletedFilters).toEqual([
      ['property_id', property.id],
      ['source_type', 'planning_portal'],
    ]);
    expect(inserted).toHaveLength(2);
    expect(inserted.map((row) => row.raw_metadata_json)).toEqual([
      expect.objectContaining({ kind: 'plan' }),
      expect.objectContaining({ kind: 'application' }),
    ]);
    expect(inserted.every((row) => row.property_id === property.id)).toBe(true);
  });
});
