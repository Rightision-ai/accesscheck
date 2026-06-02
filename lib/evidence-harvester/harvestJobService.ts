/**
 * HarvestJobService — parses an uploaded CSV into properties, creates the harvest job + items, and
 * runs the per-property enrichment pipeline in resumable batches.
 *
 * Runs inside Next's `after()` via a service-role client (RLS bypassed) — so every insert sets
 * user_id explicitly. Per-row failures are isolated: one property erroring marks only that item
 * `failed` and never aborts the batch.
 */
import Papa from 'papaparse';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { lookupPostcode } from './postcodesService';
import { findBestEpc } from './epcService';
import { getListingHistory } from './listingHistoryService';
import {
  checkMetadata,
  getImagesForHeadings,
  isStreetViewEnabled,
  getStreetViewScreenshot,
  getStaticMap,
  hasMapsKey,
  type FetchedImage,
} from './streetViewService';
import { analyseExterior } from './exteriorVisionService';
import { computeEvidenceStatus, buildDerivedFeatures } from './evidenceStatusService';
import type {
  ColumnMapping,
  EvidenceBundle,
  ExteriorObservations,
  EpcMatch,
  ListingRecord,
} from './types';

type DB = SupabaseClient<Database>;
type PropertyRow = Database['public']['Tables']['properties']['Row'];

const BATCH_SIZE = Number(process.env.HARVEST_BATCH_SIZE) || 100;

export type ParsedRow = {
  row_number: number;
  address: string;
  postcode: string;
  property_ref?: string | null;
  uprn?: string | null;
  bedrooms?: number | null;
  floor_level?: string | null;
  property_type?: string | null;
  known_adaptations?: string | null;
};

/** Parse CSV text into normalised property rows using the user's column mapping. */
export function parseCsv(csvText: string, mapping: ColumnMapping): ParsedRow[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const rows: ParsedRow[] = [];
  parsed.data.forEach((record, idx) => {
    const address = (record[mapping.address] ?? '').trim();
    const postcode = (record[mapping.postcode] ?? '').trim();
    if (!address && !postcode) return; // skip blank lines
    const intVal = (key?: string) => {
      if (!key) return null;
      const n = parseInt((record[key] ?? '').trim(), 10);
      return Number.isFinite(n) ? n : null;
    };
    const strVal = (key?: string) => (key ? (record[key] ?? '').trim() || null : null);
    rows.push({
      row_number: idx + 1,
      address,
      postcode,
      property_ref: strVal(mapping.property_ref),
      uprn: strVal(mapping.uprn),
      bedrooms: intVal(mapping.bedrooms),
      floor_level: strVal(mapping.floor_level),
      property_type: strVal(mapping.property_type),
      known_adaptations: strVal(mapping.known_adaptations),
    });
  });
  return rows;
}

/** Create the harvest job, its property rows, and one job item per property. */
export async function createJobWithProperties(
  db: DB,
  args: {
    userId: string;
    councilId?: string | null;
    filePath: string;
    originalFilename: string;
    mapping: ColumnMapping;
    rows: ParsedRow[];
  },
): Promise<{ jobId: string; total: number }> {
  const { userId, filePath, originalFilename, mapping, rows } = args;

  const { data: job, error: jobErr } = await db
    .from('harvest_jobs')
    .insert({
      user_id: userId,
      council_id: args.councilId ?? null,
      uploaded_file_url: filePath,
      original_filename: originalFilename,
      column_mapping: mapping as unknown as Database['public']['Tables']['harvest_jobs']['Insert']['column_mapping'],
      status: 'queued',
      total_properties: rows.length,
    })
    .select('id')
    .single();
  if (jobErr || !job) throw new Error(`Failed to create harvest job: ${jobErr?.message}`);

  // Insert properties, then items pointing at them. Chunked to keep payloads reasonable.
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { data: inserted, error: propErr } = await db
      .from('properties')
      .insert(
        chunk.map((r) => ({
          user_id: userId,
          council_id: args.councilId ?? null,
          property_ref: r.property_ref,
          uprn: r.uprn,
          uprn_source: r.uprn ? 'csv_upload' : null,
          address: r.address || '(missing address)',
          postcode: r.postcode || '(missing postcode)',
          bedrooms: r.bedrooms,
          floor_level: r.floor_level,
          property_type: r.property_type,
          known_adaptations: r.known_adaptations,
        })),
      )
      .select('id');
    if (propErr || !inserted) throw new Error(`Failed to create properties: ${propErr?.message}`);

    const items = inserted.map((p, j) => ({
      user_id: userId,
      job_id: job.id,
      property_id: p.id,
      row_number: chunk[j].row_number,
      status: 'pending',
    }));
    const { error: itemErr } = await db.from('harvest_job_items').insert(items);
    if (itemErr) throw new Error(`Failed to create job items: ${itemErr.message}`);
  }

  return { jobId: job.id, total: rows.length };
}

/**
 * Process one batch of pending items for a job. Returns whether more remain so the caller can
 * re-invoke (resumable batches keep each `after()` invocation under the platform time limit).
 */
export async function runJobBatch(
  db: DB,
  jobId: string,
): Promise<{ done: boolean; processedThisBatch: number; failedThisBatch: number }> {
  const { data: items } = await db
    .from('harvest_job_items')
    .select('id, property_id, user_id')
    .eq('job_id', jobId)
    .eq('status', 'pending')
    .limit(BATCH_SIZE);

  if (!items || items.length === 0) {
    await finaliseJob(db, jobId);
    return { done: true, processedThisBatch: 0, failedThisBatch: 0 };
  }

  let failed = 0;
  for (const item of items) {
    try {
      await db.from('harvest_job_items').update({ status: 'processing' }).eq('id', item.id);
      if (!item.property_id) throw new Error('Item has no property');
      const { data: property } = await db
        .from('properties')
        .select('*')
        .eq('id', item.property_id)
        .single();
      if (!property) throw new Error('Property not found');

      await enrichProperty(db, item.user_id, property as PropertyRow);
      await db.from('harvest_job_items').update({ status: 'done', error_message: null }).eq('id', item.id);
    } catch (err) {
      failed++;
      const message = (err as Error)?.message?.slice(0, 500) ?? 'Unknown error';
      await db.from('harvest_job_items').update({ status: 'failed', error_message: message }).eq('id', item.id);
      await appendErrorLog(db, jobId, { itemId: item.id, message });
    }
  }

  // Update aggregate counters from authoritative item statuses.
  await refreshCounts(db, jobId);

  // Are there more pending items?
  const { count } = await db
    .from('harvest_job_items')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('status', 'pending');
  const remaining = count ?? 0;
  if (remaining === 0) await finaliseJob(db, jobId);

  return { done: remaining === 0, processedThisBatch: items.length, failedThisBatch: failed };
}

/** Run the full enrichment pipeline for one property and persist all evidence. */
async function enrichProperty(db: DB, userId: string, property: PropertyRow): Promise<void> {
  const address = property.address ?? '';

  // 1) Postcode validation + geography
  const postcode = await lookupPostcode(property.postcode);
  let lat: number | null = property.latitude;
  let lon: number | null = property.longitude;
  if (postcode) {
    lat = postcode.latitude;
    lon = postcode.longitude;
    await db.from('properties').update({
      postcode_normalised: postcode.postcode_normalised,
      latitude: postcode.latitude,
      longitude: postcode.longitude,
      local_authority: postcode.local_authority,
      local_authority_code: postcode.local_authority_code,
      region: postcode.region,
      ward: postcode.ward,
    }).eq('id', property.id);
    await addSource(db, userId, property.id, {
      source_type: 'postcodes_io',
      source_name: 'Postcodes.io',
      raw_metadata_json: postcode as unknown as Record<string, unknown>,
      confidence: 0.95,
    });
  }

  // 2) EPC enrichment + UPRN
  let epc: EpcMatch | null = null;
  try {
    epc = await findBestEpc({ uprn: property.uprn, postcode: property.postcode, address });
  } catch {
    epc = null;
  }
  if (epc) {
    await addSource(db, userId, property.id, {
      source_type: 'epc',
      source_name: 'EPC Register',
      external_reference: epc.lmk_key,
      source_date: epc.lodgement_date,
      raw_metadata_json: epc as unknown as Record<string, unknown>,
      confidence: epc.match_confidence,
    });
    if (epc.uprn && !property.uprn) {
      await db.from('properties').update({ uprn: epc.uprn, uprn_source: 'epc' }).eq('id', property.id);
    }
    if (epc.property_type) {
      await db.from('properties').update({ property_type: epc.property_type }).eq('id', property.id);
    }
  }

  // 3) Listing history (sale: Land Registry free; rent: optional provider)
  let listings: ListingRecord[] = [];
  try {
    listings = await getListingHistory(property.postcode, address);
  } catch {
    listings = [];
  }
  for (const listing of listings) {
    const srcId = await addSource(db, userId, property.id, {
      source_type: listing.listing_type === 'sale' ? 'land_registry' : 'listing_portal',
      source_name: listing.source_name,
      source_url: listing.source_url,
      source_date: listing.event_date,
      raw_metadata_json: (listing.raw_metadata ?? {}) as Record<string, unknown>,
    });
    await db.from('property_listings').insert({
      user_id: userId,
      property_id: property.id,
      evidence_source_id: srcId,
      listing_type: listing.listing_type,
      event_date: listing.event_date,
      price_gbp: listing.price_gbp,
      status: listing.status,
      source_name: listing.source_name,
      source_url: listing.source_url,
      raw_metadata: (listing.raw_metadata ?? {}) as Database['public']['Tables']['property_listings']['Insert']['raw_metadata'],
    });
  }

  // 4) Street View metadata (free) + optional exterior AI vision (paid, gated)
  let exterior: ExteriorObservations | null = null;
  let streetViewAvailable = false;
  if (isStreetViewEnabled() && lat != null && lon != null) {
    const meta = await checkMetadata(lat, lon);
    streetViewAvailable = meta.available;
    if (meta.available) {
      await addSource(db, userId, property.id, {
        source_type: 'google_street_view',
        source_name: 'Google Street View',
        source_date: meta.image_date,
        external_reference: meta.pano_id,
        raw_metadata_json: meta as unknown as Record<string, unknown>,
      });
      const images = await getImagesForHeadings(lat, lon);
      if (images.length > 0) {
        exterior = await analyseExterior(images.map((i) => ({ mime: i.mime, base64: i.base64 })));
      }
    }
  }

  // 4b) Save a Street View screenshot + a static map to storage (signed-URL display on the page).
  if (lat != null && lon != null && hasMapsKey()) {
    const [sv, map] = await Promise.all([
      getStreetViewScreenshot(lat, lon).catch(() => null),
      getStaticMap(lat, lon).catch(() => null),
    ]);
    const patch: Record<string, string> = {};
    const svPath = sv && (await uploadImage(db, userId, property.id, 'streetview', sv));
    if (svPath) patch.street_view_image_path = svPath;
    const mapPath = map && (await uploadImage(db, userId, property.id, 'map', map));
    if (mapPath) patch.map_image_path = mapPath;
    if (Object.keys(patch).length > 0) {
      await db.from('properties').update(patch).eq('id', property.id);
    }
  }

  // 5) Evidence status + derived features + question mapping
  const bundle: EvidenceBundle = {
    hasValidPostcode: Boolean(postcode),
    epc,
    exterior,
    streetViewAvailable,
    listings,
    internalRecordPresent: false,
    features: [],
  };
  const status = computeEvidenceStatus(bundle);

  const derived = buildDerivedFeatures({ epc, exterior, internalRecordPresent: false });
  if (derived.length > 0) {
    await db.from('property_features').insert(
      derived.map((f) => ({
        user_id: userId,
        property_id: property.id,
        feature_name: f.feature_name,
        feature_value: (f.feature_value ?? null) as Database['public']['Tables']['property_features']['Insert']['feature_value'],
        source_type: f.source_type,
        confidence: f.confidence,
        inferred: f.inferred,
        justification: f.justification ?? null,
      })),
    );
  }

  await db.from('property_assessment_status').upsert({
    property_id: property.id,
    user_id: userId,
    evidence_status: status.evidence_status,
    assessment_readiness: status.assessment_readiness,
    overall_confidence: status.overall_confidence,
    missing_evidence: status.missing_evidence as unknown as Database['public']['Tables']['property_assessment_status']['Insert']['missing_evidence'],
    question_mapping: status.question_mapping as unknown as Database['public']['Tables']['property_assessment_status']['Insert']['question_mapping'],
    recommended_action: status.recommended_action,
  });
}

/**
 * Create a single property from a manual entry and run the full enrichment pipeline synchronously.
 * Used by the "Check a property" single-lookup flow — returns the new property id so the caller can
 * redirect straight to its evidence profile.
 */
export async function createAndEnrichProperty(
  db: DB,
  userId: string,
  input: { address: string; postcode: string; uprn?: string | null; councilId?: string | null },
): Promise<string> {
  const { data: property, error } = await db
    .from('properties')
    .insert({
      user_id: userId,
      council_id: input.councilId ?? null,
      address: input.address,
      postcode: input.postcode,
      uprn: input.uprn || null,
      uprn_source: input.uprn ? 'manual' : null,
    })
    .select('*')
    .single();
  if (error || !property) throw new Error(`Failed to create property: ${error?.message}`);
  await enrichProperty(db, userId, property as PropertyRow);
  return property.id;
}

/** Recompute status for a single property on demand (preliminary-assessment endpoint). */
export async function recomputePropertyStatus(db: DB, userId: string, propertyId: string): Promise<void> {
  const { data: property } = await db.from('properties').select('*').eq('id', propertyId).single();
  if (!property) throw new Error('Property not found');
  await enrichProperty(db, userId, property as PropertyRow);
}

/** Re-queue only failed items for re-processing. */
export async function retryFailedItems(db: DB, jobId: string): Promise<number> {
  const { data } = await db
    .from('harvest_job_items')
    .update({ status: 'pending', error_message: null })
    .eq('job_id', jobId)
    .eq('status', 'failed')
    .select('id');
  await db.from('harvest_jobs').update({ status: 'running' }).eq('id', jobId);
  return data?.length ?? 0;
}

async function addSource(
  db: DB,
  userId: string,
  propertyId: string,
  source: {
    source_type: string;
    source_name?: string | null;
    source_url?: string | null;
    source_date?: string | null;
    external_reference?: string | null;
    raw_metadata_json?: Record<string, unknown>;
    confidence?: number | null;
  },
): Promise<string | null> {
  const { data } = await db
    .from('evidence_sources')
    .insert({
      user_id: userId,
      property_id: propertyId,
      source_type: source.source_type,
      source_name: source.source_name ?? null,
      source_url: source.source_url ?? null,
      source_date: source.source_date ?? null,
      external_reference: source.external_reference ?? null,
      raw_metadata_json: (source.raw_metadata_json ?? {}) as Database['public']['Tables']['evidence_sources']['Insert']['raw_metadata_json'],
      confidence: source.confidence ?? null,
    })
    .select('id')
    .single();
  return data?.id ?? null;
}

/** Upload a fetched image to the private property-images bucket; returns the object path. */
async function uploadImage(
  db: DB,
  userId: string,
  propertyId: string,
  name: 'streetview' | 'map',
  image: FetchedImage,
): Promise<string | null> {
  const ext = image.mime.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/${propertyId}/${name}.${ext}`;
  const { error } = await db.storage
    .from('property-images')
    .upload(path, image.buffer, { contentType: image.mime, upsert: true });
  if (error) {
    console.warn(`[evidence-harvester] image upload failed (${name}):`, error.message);
    return null;
  }
  return path;
}

async function refreshCounts(db: DB, jobId: string): Promise<void> {
  const { count: processed } = await db
    .from('harvest_job_items')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .in('status', ['done', 'failed']);
  const { count: failed } = await db
    .from('harvest_job_items')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('status', 'failed');
  await db
    .from('harvest_jobs')
    .update({ processed_count: processed ?? 0, failed_count: failed ?? 0, status: 'running' })
    .eq('id', jobId);
}

async function finaliseJob(db: DB, jobId: string): Promise<void> {
  const { count: failed } = await db
    .from('harvest_job_items')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('status', 'failed');
  await db
    .from('harvest_jobs')
    .update({
      status: (failed ?? 0) > 0 ? 'completed_with_errors' : 'completed',
      finished_at: new Date().toISOString(),
      job_status: { status: 'completed', startedAt: '', finishedAt: new Date().toISOString() } as unknown as Database['public']['Tables']['harvest_jobs']['Update']['job_status'],
    })
    .eq('id', jobId);
}

async function appendErrorLog(db: DB, jobId: string, entry: Record<string, unknown>): Promise<void> {
  const { data } = await db.from('harvest_jobs').select('error_log').eq('id', jobId).single();
  const log = Array.isArray(data?.error_log) ? (data!.error_log as unknown[]) : [];
  log.push({ ...entry, at: new Date().toISOString() });
  await db
    .from('harvest_jobs')
    .update({ error_log: log.slice(-200) as unknown as Database['public']['Tables']['harvest_jobs']['Update']['error_log'] })
    .eq('id', jobId);
}
