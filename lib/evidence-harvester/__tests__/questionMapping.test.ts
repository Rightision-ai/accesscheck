import { describe, it, expect } from 'vitest';
import { buildQuestionMapping, buildDerivedFeatures } from '../questionMapping';
import type { ExteriorObservations, EpcMatch } from '../types';

const baseExterior: ExteriorObservations = {
  entrance_visible: true, visible_steps_count: 0, ramp_visible: false, handrail_visible: false,
  front_path_slope: 'flat', threshold_risk: 'low', visual_property_type: null,
  communal_entrance_visible: false, parking_or_dropoff_visible: false, image_quality: 'high', confidence: 0.72,
};

describe('buildQuestionMapping — Q3 entrance route', () => {
  it('0 steps maps to "No steps, flat"', () => {
    const m = buildQuestionMapping({ epc: null, exterior: baseExterior, internalRecordPresent: false });
    const q3 = m.find((e) => e.question === 'Q3 Entrance Route');
    expect(q3?.answer).toBe('No steps, flat');
    expect(q3?.surveyColumn).toBe('property_door_steps_count');
  });

  it('3 steps maps to "Few steps"', () => {
    const m = buildQuestionMapping({
      epc: null, exterior: { ...baseExterior, visible_steps_count: 3 }, internalRecordPresent: false,
    });
    expect(m.find((e) => e.question === 'Q3 Entrance Route')?.answer).toBe('Few steps');
  });

  it('keeps Q8 shower/bath unknown without internal evidence', () => {
    const m = buildQuestionMapping({ epc: null, exterior: baseExterior, internalRecordPresent: false });
    const q8 = m.find((e) => e.question.includes('Shower'));
    expect(q8?.missing_evidence).toBe(true);
    expect(q8?.recommended_action).toBeTruthy();
  });
});

describe('buildDerivedFeatures', () => {
  it('emits EPC + exterior features with confidence', () => {
    const epc = { property_type: 'Bungalow', match_confidence: 0.8 } as EpcMatch;
    const features = buildDerivedFeatures({ epc, exterior: baseExterior, internalRecordPresent: false });
    const names = features.map((f) => f.feature_name);
    expect(names).toContain('property_type');
    expect(names).toContain('ramp_visible');
    expect(features.every((f) => f.inferred)).toBe(true);
  });
});
