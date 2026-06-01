import { describe, it, expect } from 'vitest';
import { computeEvidenceStatus } from '../evidenceStatusService';
import type { EvidenceBundle, EpcMatch, ExteriorObservations } from '../types';

const epc: EpcMatch = {
  uprn: '100', lmk_key: 'A', address: '10 X St', postcode: 'SW1A 2AA', property_type: 'House',
  built_form: 'Detached', total_floor_area: '90', construction_age_band: '2000', lodgement_date: '2022-01-01',
  inspection_date: '2022-01-01', local_authority: 'Westminster', current_energy_rating: 'C', match_confidence: 0.8,
};

const exterior: ExteriorObservations = {
  entrance_visible: true, visible_steps_count: 2, ramp_visible: false, handrail_visible: true,
  front_path_slope: 'flat', threshold_risk: 'low', visual_property_type: 'terraced_house',
  communal_entrance_visible: false, parking_or_dropoff_visible: false, image_quality: 'high', confidence: 0.7,
};

function bundle(p: Partial<EvidenceBundle>): EvidenceBundle {
  return {
    hasValidPostcode: false, epc: null, exterior: null, streetViewAvailable: false,
    listings: [], internalRecordPresent: false, features: [], ...p,
  };
}

describe('computeEvidenceStatus', () => {
  it('no evidence -> no_useful_evidence', () => {
    expect(computeEvidenceStatus(bundle({})).evidence_status).toBe('no_useful_evidence');
  });

  it('postcode only -> needs_manual_survey', () => {
    expect(computeEvidenceStatus(bundle({ hasValidPostcode: true })).evidence_status).toBe('needs_manual_survey');
  });

  it('postcode + EPC -> data_enriched_only', () => {
    expect(computeEvidenceStatus(bundle({ hasValidPostcode: true, epc })).evidence_status).toBe('data_enriched_only');
  });

  it('postcode + EPC + exterior -> exterior_only', () => {
    expect(computeEvidenceStatus(bundle({ hasValidPostcode: true, epc, exterior })).evidence_status).toBe('exterior_only');
  });

  it('internal record -> auto_assessable', () => {
    expect(computeEvidenceStatus(bundle({ internalRecordPresent: true })).evidence_status).toBe('auto_assessable');
  });

  it('postcode-only confidence stays low', () => {
    const r = computeEvidenceStatus(bundle({ hasValidPostcode: true }));
    expect(r.overall_confidence).toBeLessThan(0.4);
  });

  it('emits a missing-evidence checklist for unknowable questions', () => {
    const r = computeEvidenceStatus(bundle({ hasValidPostcode: true, epc }));
    const questions = r.missing_evidence.map((m) => m.question);
    expect(questions.some((q) => q.includes('Shower'))).toBe(true);
  });
});
