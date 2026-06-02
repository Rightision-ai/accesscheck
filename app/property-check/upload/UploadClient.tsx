'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { createClient } from '@/lib/supabase/client';
import { uploadCsvToBucket, createHarvestJob, startHarvestJob, pollJobStatus } from '@/lib/evidence-harvester/client';
import type { ColumnMapping } from '@/lib/evidence-harvester/types';
import { Card, Progress } from '@/app/components/property-check/ui';

const TARGET_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: 'address', label: 'Address', required: true },
  { key: 'postcode', label: 'Postcode', required: true },
  { key: 'property_ref', label: 'Property Reference', required: false },
  { key: 'uprn', label: 'UPRN', required: false },
  { key: 'bedrooms', label: 'Bedrooms', required: false },
  { key: 'floor_level', label: 'Floor Level', required: false },
  { key: 'property_type', label: 'Property Type', required: false },
  { key: 'known_adaptations', label: 'Known Adaptations', required: false },
];

/** Best-effort auto-mapping of a CSV header to a target field. */
function guess(headers: string[], candidates: string[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const c of candidates) {
    const found = headers.find((h) => norm(h) === norm(c) || norm(h).includes(norm(c)));
    if (found) return found;
  }
  return '';
}

export default function UploadClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0, failed: 0 });

  function onFile(f: File) {
    setError(null);
    setFile(f);
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      preview: 10,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const hs = res.meta.fields ?? [];
        setHeaders(hs);
        setPreview(res.data);
        setMapping({
          address: guess(hs, ['address', 'addr', 'full address']),
          postcode: guess(hs, ['postcode', 'post code', 'zip']),
          property_ref: guess(hs, ['property_ref', 'ref', 'reference', 'uprn ref']),
          uprn: guess(hs, ['uprn']),
          bedrooms: guess(hs, ['bedrooms', 'beds']),
          floor_level: guess(hs, ['floor_level', 'floor']),
          property_type: guess(hs, ['property_type', 'type']),
          known_adaptations: guess(hs, ['known_adaptations', 'adaptations']),
        });
      },
      error: (err) => setError(err.message),
    });
  }

  async function onStart() {
    setError(null);
    if (!file) return;
    if (!mapping.address || !mapping.postcode) {
      setError('Address and Postcode columns must be mapped.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in.');

      const path = await uploadCsvToBucket(file, user.id);
      const { jobId, total } = await createHarvestJob({
        filePath: path,
        originalFilename: file.name,
        mapping: mapping as ColumnMapping,
      });
      await startHarvestJob(jobId);

      // Switch to the processing animation and poll until the job finishes, then go to Survey.
      setProcessing(true);
      setProgress({ processed: 0, total, failed: 0 });
      await pollJobStatus(
        jobId,
        (s) => setProgress({ processed: s.processed_count, total: s.total_properties, failed: s.failed_count }),
        { intervalMs: 2000 },
      );
      router.push('/property-check/survey-priority');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      setProcessing(false);
    }
  }

  if (processing) {
    const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
    return (
      <div className="min-h-[72vh] flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <h2 className="text-lg font-extrabold text-slate-900">Checking your properties…</h2>
          <p className="text-sm text-slate-500 mt-1">
            Validating postcodes, matching EPC records and gathering evidence. You&apos;ll be taken to
            the Property List when it&apos;s done.
          </p>
          <div className="mt-5">
            <Progress value={progress.processed} max={progress.total} />
            <p className="text-xs text-slate-500 mt-2">
              {progress.processed} of {progress.total} processed ({pct}%)
              {progress.failed > 0 && ` · ${progress.failed} failed`}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Check Multiple Properties</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload a CSV with at least <span className="font-semibold">address</span> and{' '}
          <span className="font-semibold">postcode</span>. Each property is enriched with public
          evidence — this produces a preliminary evidence map, not a final assessment.
        </p>
        <a
          href="/sample-properties.csv"
          download
          className="inline-block mt-2 text-sm font-semibold text-primary hover:underline"
        >
          ↓ Download a sample CSV
        </a>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Card>
        <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-10 cursor-pointer hover:border-primary">
          <span className="text-sm font-semibold text-slate-700">
            {file ? file.name : 'Choose a CSV file'}
          </span>
          <span className="text-xs text-slate-400">CSV up to 20 MB</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
      </Card>

      {headers.length > 0 && (
        <>
          <Card>
            <h2 className="text-sm font-bold text-slate-900 mb-3">Map columns</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TARGET_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <label className="w-40 text-sm text-slate-600 shrink-0">
                    {f.label}
                    {f.required && <span className="text-rose-500"> *</span>}
                  </label>
                  <select
                    value={mapping[f.key] ?? ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="">— not mapped —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-bold text-slate-900 mb-3">Preview (first {preview.length} rows)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-gray-200">
                    {headers.map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {headers.map((h) => <td key={h} className="px-2 py-1.5 text-slate-700">{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <button
            onClick={onStart}
            disabled={busy}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? 'Starting…' : 'Run Check'}
          </button>
        </>
      )}
    </div>
  );
}
