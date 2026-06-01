/**
 * EvidenceStatusService — combines all evidence for a property into a readiness status, an overall
 * confidence, a missing-evidence checklist, a recommended action, and the AccessCheck question
 * mapping. Implements the spec's §6 status decision tree and §13 confidence weighting.
 *
 * Product principle: keep "evidence found", "feature inferred", "confidence", and "missing evidence"
 * separate, and never let postcode-only data drive a high-confidence accessibility status.
 */
import { buildQuestionMapping, buildDerivedFeatures } from './questionMapping';
import type {
  EvidenceBundle,
  EvidenceStatus,
  EvidenceStatusResult,
  MissingEvidenceItem,
  QuestionMappingEntry,
} from './types';

const RECOMMENDED_ACTION: Record<EvidenceStatus, string> = {
  auto_assessable: 'Ready for preliminary assessment.',
  exterior_only:
    'Exterior-only pre-screen available; internal survey needed for bathroom and door widths.',
  data_enriched_only: 'Data enriched only; exterior/internal evidence needed.',
  needs_manual_survey: 'Manual survey required.',
  no_useful_evidence: 'No useful evidence found; verify address and request council records.',
};

const READINESS_LABEL: Record<EvidenceStatus, string> = {
  auto_assessable: 'Ready for preliminary assessment',
  exterior_only: 'Exterior pre-screen only',
  data_enriched_only: 'Data enriched, needs site evidence',
  needs_manual_survey: 'Needs manual survey',
  no_useful_evidence: 'No useful evidence',
};

function computeStatus(b: EvidenceBundle): EvidenceStatus {
  const hasExterior = Boolean(b.exterior && b.exterior.entrance_visible);

  if (b.internalRecordPresent) return 'auto_assessable';
  if (b.hasValidPostcode && b.epc && hasExterior) return 'exterior_only';
  if (b.hasValidPostcode && b.epc) return 'data_enriched_only';
  if (b.hasValidPostcode || b.epc || hasExterior) return 'needs_manual_survey';
  return 'no_useful_evidence';
}

/**
 * Overall confidence = weighted blend of the high-value evidence present, using the spec §13 bands.
 * Postcode-only contributes little so it can't inflate the score.
 */
function computeConfidence(b: EvidenceBundle): number {
  const parts: { weight: number; value: number }[] = [];
  if (b.internalRecordPresent) parts.push({ weight: 0.9, value: 0.9 });
  if (b.epc) parts.push({ weight: 0.8, value: clamp(b.epc.match_confidence, 0.5, 0.9) });
  if (b.exterior && b.exterior.entrance_visible)
    parts.push({ weight: 0.6, value: clamp(b.exterior.confidence, 0.55, 0.8) });
  if (b.hasValidPostcode) parts.push({ weight: 0.2, value: 0.3 });

  if (parts.length === 0) return 0;
  const wsum = parts.reduce((s, p) => s + p.weight, 0);
  const acc = parts.reduce((s, p) => s + p.weight * p.value, 0);
  return Number((acc / wsum).toFixed(2));
}

export function computeEvidenceStatus(bundle: EvidenceBundle): EvidenceStatusResult {
  const status = computeStatus(bundle);
  const question_mapping = buildQuestionMapping({
    epc: bundle.epc,
    exterior: bundle.exterior,
    internalRecordPresent: bundle.internalRecordPresent,
  });

  const missing_evidence: MissingEvidenceItem[] = question_mapping
    .filter((q: QuestionMappingEntry) => q.missing_evidence)
    .map((q) => ({
      question: q.question,
      reason: q.justification ?? 'Evidence not available.',
      recommended_action: q.recommended_action ?? 'Manual survey required.',
    }));

  return {
    evidence_status: status,
    assessment_readiness: READINESS_LABEL[status],
    overall_confidence: computeConfidence(bundle),
    missing_evidence,
    question_mapping,
    recommended_action: RECOMMENDED_ACTION[status],
  };
}

/** Re-export so the worker can persist derived features alongside the status. */
export { buildDerivedFeatures };

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
