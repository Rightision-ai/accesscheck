/**
 * Client-side helpers for the Evidence Harvester UI: upload a CSV to the private bucket, kick off a
 * job, and poll its status (mirrors lib/accessibility/cost-estimation/client.ts).
 */
'use client';

import { createClient } from '@/lib/supabase/client';
import type { ColumnMapping } from './types';

export type JobStatusResponse = {
  id: string;
  status: string;
  total_properties: number;
  processed_count: number;
  failed_count: number;
};

/** Upload the CSV to the user's private folder; returns the storage object path. */
export async function uploadCsvToBucket(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage
    .from('property-csv-uploads')
    .upload(path, file, { upsert: false, contentType: 'text/csv' });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function createHarvestJob(args: {
  filePath: string;
  originalFilename: string;
  mapping: ColumnMapping;
}): Promise<{ jobId: string; total: number }> {
  const res = await fetch('/api/evidence-harvester/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_path: args.filePath,
      original_filename: args.originalFilename,
      column_mapping: args.mapping,
    }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? 'Failed to create job');
  const data = await res.json();
  return { jobId: data.jobId, total: data.total };
}

export async function startHarvestJob(jobId: string): Promise<void> {
  const res = await fetch(`/api/evidence-harvester/jobs/${jobId}/start`, { method: 'POST' });
  if (!res.ok && res.status !== 202) throw new Error('Failed to start job');
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`/api/evidence-harvester/jobs/${jobId}/status`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch job status');
  return res.json();
}

/**
 * Poll job status until completion or timeout. Calls onTick with each snapshot. The server keeps
 * processing batches via after(); when status is terminal we stop.
 */
export async function pollJobStatus(
  jobId: string,
  onTick: (s: JobStatusResponse) => void,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<JobStatusResponse> {
  const intervalMs = opts.intervalMs ?? 3000;
  const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
  const start = Date.now();
  const terminal = new Set(['completed', 'completed_with_errors', 'failed']);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const s = await getJobStatus(jobId);
    onTick(s);
    if (terminal.has(s.status)) return s;
    // Nudge the next batch (resumable). Ignore failures — the next poll will retry.
    void startHarvestJob(jobId).catch(() => {});
    if (Date.now() - start > timeoutMs) return s;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
