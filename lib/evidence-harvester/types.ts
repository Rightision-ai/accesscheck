/**
 * Shared domain types for the Evidence Harvester feature.
 */

export const EVIDENCE_SOURCE_TYPES = [
  'postcodes_io',
  'epc',
  'google_street_view',
  'land_registry',
  'listing_portal',
  'planning_portal',
  'internal_record',
  'manual_upload',
  'cbl_advert',
  'similar_property_inference',
] as const;
export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

export const EVIDENCE_STATUSES = [
  'auto_assessable',
  'exterior_only',
  'data_enriched_only',
  'needs_manual_survey',
  'no_useful_evidence',
] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

/** Per-property item lifecycle inside a harvest job. */
export type JobItemStatus =
  | 'pending'
  | 'processing'
  | 'done'
  | 'failed';

/** Overall harvest job lifecycle. */
export type HarvestJobLifecycle =
  | 'queued'
  | 'running'
  | 'completed'
  | 'completed_with_errors'
  | 'failed';

/** Granular background-worker status persisted to harvest_jobs.job_status (mirrors cost-estimation). */
export type HarvestJobStatus = {
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  error?: string;
  step?: string;
  /** Index of the next unprocessed item — supports resumable batches. */
  cursor?: number;
};

/** Maps internal field names to the user's CSV header names. */
export type ColumnMapping = {
  address: string;
  postcode: string;
  property_ref?: string;
  uprn?: string;
  bedrooms?: string;
  floor_level?: string;
  property_type?: string;
  known_adaptations?: string;
};

// --- Service result shapes -------------------------------------------------

export type PostcodeResult = {
  postcode: string;
  postcode_normalised: string;
  latitude: number | null;
  longitude: number | null;
  local_authority: string | null;
  local_authority_code: string | null;
  region: string | null;
  ward: string | null;
};

/** Accessibility-relevant detail pulled from the full EPC certificate. */
export type EpcDetails = {
  dwelling_type: string | null;        // e.g. "Mid-floor flat", "Ground-floor flat", "Detached house"
  habitable_room_count: number | null;
  heated_room_count: number | null;
  extensions_count: number | null;
  floor_descriptions: string[];        // e.g. ["(other premises below)"]
  energy_rating_current: number | null;   // numeric SAP points
  energy_rating_potential: number | null;
  potential_energy_band: string | null;
  main_heating: string | null;
};

export type EpcMatch = {
  uprn: string | null;
  lmk_key: string | null;
  address: string | null;
  postcode: string | null;
  property_type: string | null;
  built_form: string | null;
  total_floor_area: string | null;
  construction_age_band: string | null;
  lodgement_date: string | null;
  inspection_date: string | null;
  local_authority: string | null;
  current_energy_rating: string | null;
  /** 0–1 address-match confidence. */
  match_confidence: number;
  details: EpcDetails | null;
};

export type ListingRecord = {
  listing_type: 'sale' | 'rent';
  event_date: string | null;
  price_gbp: number | null;
  status: string | null;
  source_name: string;
  source_url: string | null;
  raw_metadata?: Record<string, unknown>;
};

export type FrontPathSlope = 'flat' | 'slight_slope' | 'steady_slope' | 'steep_slope' | 'unknown';

export type ExteriorObservations = {
  entrance_visible: boolean;
  visible_steps_count: number | null;
  ramp_visible: boolean;
  handrail_visible: boolean;
  front_path_slope: FrontPathSlope;
  threshold_risk: 'low' | 'medium' | 'high' | 'unknown';
  visual_property_type: string | null;
  communal_entrance_visible: boolean;
  parking_or_dropoff_visible: boolean;
  image_quality: 'low' | 'medium' | 'high' | 'unknown';
  confidence: number;
  justification?: string;
};

export type StreetViewMeta = {
  available: boolean;
  pano_id: string | null;
  image_date: string | null;
  latitude: number | null;
  longitude: number | null;
};

// --- Derived feature / assessment shapes ----------------------------------

/** A single inferred feature to persist into property_features. */
export type DerivedFeature = {
  feature_name: string;
  feature_value: unknown;
  source_type: EvidenceSourceType;
  confidence: number;
  inferred: boolean;
  justification?: string;
};

/** A mapping of an inferred feature to an AccessCheck question (a `surveys` column). */
export type QuestionMappingEntry = {
  question: string;
  surveyColumn: string | null;
  answer: string;
  inferred: boolean;
  source?: EvidenceSourceType;
  confidence?: number;
  justification?: string;
  missing_evidence?: boolean;
  recommended_action?: string;
};

export type MissingEvidenceItem = {
  question: string;
  reason: string;
  recommended_action: string;
};

export type EvidenceStatusResult = {
  evidence_status: EvidenceStatus;
  assessment_readiness: string;
  overall_confidence: number;
  missing_evidence: MissingEvidenceItem[];
  question_mapping: QuestionMappingEntry[];
  recommended_action: string;
};

/** Everything the EvidenceStatusService needs to compute a property's status. */
export type EvidenceBundle = {
  hasValidPostcode: boolean;
  epc: EpcMatch | null;
  exterior: ExteriorObservations | null;
  streetViewAvailable: boolean;
  listings: ListingRecord[];
  internalRecordPresent: boolean;
  features: DerivedFeature[];
};
