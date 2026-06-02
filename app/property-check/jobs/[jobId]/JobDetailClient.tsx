'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { pollJobStatus, getJobStatus, type JobStatusResponse } from '@/lib/evidence-harvester/client';
import { Badge, Bool, Confidence, Progress, StatCard, SkeletonRows } from '@/app/components/property-check/ui';

type Item = {
  item_id: string;
  property_id: string | null;
  row_number: number | null;
  item_status: string;
  error_message: string | null;
  address: string | null;
  postcode: string | null;
  postcode_valid: boolean;
  uprn: string | null;
  property_type: string | null;
  epc_matched: boolean;
  street_view_available: boolean;
  evidence_status: string | null;
  assessment_readiness: string | null;
  overall_confidence: number | null;
  recommended_action: string | null;
};

const EVIDENCE_FILTERS = [
  { value: '', label: 'All evidence statuses' },
  { value: 'auto_assessable', label: 'Auto-assessable' },
  { value: 'exterior_only', label: 'Exterior only' },
  { value: 'data_enriched_only', label: 'Data enriched only' },
  { value: 'needs_manual_survey', label: 'Needs manual survey' },
  { value: 'no_useful_evidence', label: 'No useful evidence' },
];

type InitialJob = JobStatusResponse & { original_filename: string | null };

export default function JobDetailClient({
  jobId,
  initialJob,
}: {
  jobId: string;
  initialJob: InitialJob;
}) {
  const [job, setJob] = useState<InitialJob>(initialJob);
  const [items, setItems] = useState<Item[]>([]);
  const [evidenceFilter, setEvidenceFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    const qs = evidenceFilter ? `?evidence_status=${evidenceFilter}` : '';
    const res = await fetch(`/api/evidence-harvester/jobs/${jobId}/items${qs}`, { cache: 'no-store' });
    if (res.ok) setItems((await res.json()).items ?? []);
    setLoading(false);
  }, [jobId, evidenceFilter]);

  // Poll job progress while it's running; refresh items on each tick.
  useEffect(() => {
    let active = true;
    const terminal = new Set(['completed', 'completed_with_errors', 'failed']);
    if (terminal.has(initialJob.status)) {
      loadItems();
      return;
    }
    pollJobStatus(
      jobId,
      (s) => {
        if (!active) return;
        setJob((prev) => ({ ...prev, ...s }));
        loadItems();
      },
      { intervalMs: 3000 },
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const counts = aggregate(items);
  const running = !['completed', 'completed_with_errors', 'failed'].includes(job.status);

  async function retryFailed() {
    await fetch(`/api/evidence-harvester/jobs/${jobId}/retry-failed`, { method: 'POST' });
    const s = await getJobStatus(jobId);
    setJob((prev) => ({ ...prev, ...s }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/property-check/jobs" className="text-xs font-semibold text-slate-500 hover:text-primary">
            ← All jobs
          </Link>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1">{initialJob.original_filename}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge value={job.status} />
          {job.failed_count > 0 && (
            <button onClick={retryFailed} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-primary">
              Retry failed ({job.failed_count})
            </button>
          )}
          <a
            href={`/api/evidence-harvester/jobs/${jobId}/export`}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary/90"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div>
        <Progress value={job.processed_count} max={job.total_properties} />
        <p className="text-xs text-slate-500 mt-1">
          {job.processed_count}/{job.total_properties} processed
          {job.failed_count > 0 && ` · ${job.failed_count} failed`}
          {running && ' · processing…'}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total" value={job.total_properties} />
        <StatCard label="Postcodes valid" value={counts.postcode} />
        <StatCard label="EPC matched" value={counts.epc} />
        <StatCard label="Street View" value={counts.streetView} />
        <StatCard label="Ready (auto/exterior)" value={counts.ready} />
        <StatCard label="Needs survey" value={counts.needsSurvey} />
      </div>

      <div className="flex items-center gap-3">
        <select
          value={evidenceFilter}
          onChange={(e) => setEvidenceFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {EVIDENCE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400">{items.length} rows</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-3 py-3">Address</th>
              <th className="px-3 py-3">Postcode</th>
              <th className="px-3 py-3">UPRN</th>
              <th className="px-3 py-3">EPC</th>
              <th className="px-3 py-3">Street View</th>
              <th className="px-3 py-3">Evidence Status</th>
              <th className="px-3 py-3">Confidence</th>
              <th className="px-3 py-3">Recommended Action</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={8} cols={9} />
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">No rows.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.item_id} className="border-t border-gray-100 align-top">
                  <td className="px-3 py-2.5 font-medium text-slate-800 max-w-[220px] truncate" title={it.address ?? ''}>
                    {it.address ?? '—'}
                    {it.item_status === 'failed' && (
                      <span className="block text-[11px] text-rose-600" title={it.error_message ?? ''}>
                        failed: {it.error_message?.slice(0, 60)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {it.postcode} {!it.postcode_valid && <Badge value="failed" label="invalid" />}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 text-xs">{it.uprn ?? '—'}</td>
                  <td className="px-3 py-2.5"><Bool value={it.epc_matched} /></td>
                  <td className="px-3 py-2.5"><Bool value={it.street_view_available} /></td>
                  <td className="px-3 py-2.5"><Badge value={it.evidence_status} /></td>
                  <td className="px-3 py-2.5"><Confidence value={it.overall_confidence} /></td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[200px]">{it.recommended_action ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    {it.property_id && (
                      <Link href={`/properties/${it.property_id}/evidence`} className="text-xs font-bold text-primary whitespace-nowrap">
                        View →
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function aggregate(items: Item[]) {
  return items.reduce(
    (acc, it) => {
      if (it.postcode_valid) acc.postcode++;
      if (it.epc_matched) acc.epc++;
      if (it.street_view_available) acc.streetView++;
      if (it.evidence_status === 'auto_assessable' || it.evidence_status === 'exterior_only') acc.ready++;
      if (it.evidence_status === 'needs_manual_survey') acc.needsSurvey++;
      return acc;
    },
    { postcode: 0, epc: 0, streetView: 0, ready: 0, needsSurvey: 0 },
  );
}
