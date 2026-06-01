/**
 * Maps harvested/inferred features to AccessCheck questions — i.e. columns of the `surveys` table
 * (the column names are the real "questions"; see lib/accessibility/lahr/tables/field-mapping.json).
 *
 * Product rule: never force a low-confidence answer. Things not knowable from public data
 * (door widths, bathroom/shower type) stay `unknown` with a recommended action, unless an internal
 * record or floor plan supplies them. Postcode-only inference is capped low elsewhere.
 */
import type {
  EpcMatch,
  ExteriorObservations,
  QuestionMappingEntry,
  DerivedFeature,
  EvidenceSourceType,
} from './types';

export type MappingInput = {
  epc: EpcMatch | null;
  exterior: ExteriorObservations | null;
  internalRecordPresent: boolean;
};

/** Build the AccessCheck question mapping for a property from its evidence. */
export function buildQuestionMapping(input: MappingInput): QuestionMappingEntry[] {
  const entries: QuestionMappingEntry[] = [];

  // Q3 — Entrance Route (from exterior vision)
  if (input.exterior && input.exterior.entrance_visible) {
    const steps = input.exterior.visible_steps_count;
    if (steps != null) {
      const answer = steps === 0 ? 'No steps, flat' : steps <= 4 ? 'Few steps' : 'Many steps';
      entries.push({
        question: 'Q3 Entrance Route',
        surveyColumn: 'property_door_steps_count',
        answer,
        inferred: true,
        source: 'google_street_view',
        confidence: input.exterior.confidence,
        justification: `${steps} visible entrance step(s) detected from exterior imagery.`,
      });
    }
    if (input.exterior.ramp_visible) {
      entries.push({
        question: 'Q3 Entrance Route — Ramp',
        surveyColumn: 'has_property_ramp',
        answer: 'Ramp present',
        inferred: true,
        source: 'google_street_view',
        confidence: input.exterior.confidence,
        justification: 'A ramp is visible at the entrance in exterior imagery.',
      });
    }
    if (input.exterior.front_path_slope && input.exterior.front_path_slope !== 'unknown') {
      entries.push({
        question: 'Q3 Entrance Route — Approach',
        surveyColumn: null,
        answer: prettySlope(input.exterior.front_path_slope),
        inferred: true,
        source: 'google_street_view',
        confidence: input.exterior.confidence,
      });
    }
  } else {
    entries.push(missing('Q3 Entrance Route', 'No usable exterior imagery of the entrance.',
      'Street View image or site photo of the entrance required.'));
  }

  // Q2 — Access to Upper Floor (cautious inference from EPC property type)
  if (input.epc?.property_type) {
    const pt = input.epc.property_type.toLowerCase();
    if (pt.includes('bungalow')) {
      entries.push({
        question: 'Q2 Access to Upper Floor',
        surveyColumn: 'property_type',
        answer: 'All on one level (bungalow)',
        inferred: true,
        source: 'epc',
        confidence: Math.min(0.7, input.epc.match_confidence),
        justification: 'EPC records the property type as a bungalow.',
      });
    } else {
      entries.push({
        question: 'Q2 Access to Upper Floor',
        surveyColumn: 'property_type',
        answer: `${input.epc.property_type} (multi-level likely — confirm)`,
        inferred: true,
        source: 'epc',
        confidence: Math.min(0.5, input.epc.match_confidence),
        justification: 'Inferred from EPC property type; lift/stair access not confirmed.',
      });
    }
  } else {
    entries.push(missing('Q2 Access to Upper Floor', 'No EPC property-type evidence.',
      'EPC certificate or council stock record required.'));
  }

  // Q5 / Q7 — Door widths: not knowable from public data unless an internal record exists.
  if (!input.internalRecordPresent) {
    entries.push(missing('Q5 Entrance Door Width', 'Not measurable from public data.',
      'Measured floor plan or internal/council record required.'));
    entries.push(missing('Q7 Bathroom Door Width', 'Not measurable from public data.',
      'Measured floor plan or internal/council record required.'));
  }

  // Q8 — Shower / Bath type: only from internal/floor-plan/adaptation evidence.
  if (!input.internalRecordPresent) {
    entries.push(missing('Q8 Shower / Bath Type', 'Not visible in public/exterior evidence.',
      'Internal bathroom photo, floor plan, or adaptation record required.'));
  }

  return entries;
}

/** Inferred features (for property_features) derived from EPC + exterior observations. */
export function buildDerivedFeatures(input: MappingInput): DerivedFeature[] {
  const features: DerivedFeature[] = [];
  const push = (
    feature_name: string,
    feature_value: unknown,
    source_type: EvidenceSourceType,
    confidence: number,
    justification?: string,
  ) => features.push({ feature_name, feature_value, source_type, confidence, inferred: true, justification });

  if (input.epc) {
    if (input.epc.property_type) push('property_type', input.epc.property_type, 'epc', input.epc.match_confidence);
    if (input.epc.built_form) push('built_form', input.epc.built_form, 'epc', input.epc.match_confidence);
    if (input.epc.total_floor_area) push('floor_area', input.epc.total_floor_area, 'epc', input.epc.match_confidence);
    if (input.epc.construction_age_band)
      push('construction_age_band', input.epc.construction_age_band, 'epc', input.epc.match_confidence);
  }
  if (input.exterior) {
    const c = input.exterior.confidence;
    if (input.exterior.visible_steps_count != null)
      push('visible_steps_count', input.exterior.visible_steps_count, 'google_street_view', c, input.exterior.justification);
    push('ramp_visible', input.exterior.ramp_visible, 'google_street_view', c);
    push('handrail_visible', input.exterior.handrail_visible, 'google_street_view', c);
    push('entrance_visible', input.exterior.entrance_visible, 'google_street_view', c);
    if (input.exterior.front_path_slope !== 'unknown')
      push('front_path_slope', input.exterior.front_path_slope, 'google_street_view', c);
  }
  return features;
}

function prettySlope(s: string): string {
  switch (s) {
    case 'flat': return 'No slope, flat';
    case 'slight_slope': return 'Slight slope';
    case 'steady_slope': return 'Steady slope';
    case 'steep_slope': return 'Steep slope';
    default: return 'Unknown';
  }
}

function missing(question: string, reason: string, action: string): QuestionMappingEntry {
  return {
    question,
    surveyColumn: null,
    answer: 'unknown',
    inferred: false,
    missing_evidence: true,
    recommended_action: action,
    justification: reason,
  };
}
