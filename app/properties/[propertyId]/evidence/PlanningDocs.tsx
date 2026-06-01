'use client';

import { useMemo, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Skeleton } from '@/app/components/property-check/ui';

type Source = {
  id: string;
  source_name: string | null;
  source_url: string | null;
  raw_metadata_json?: Record<string, unknown> | null;
};

type Meta = { kind?: string; description?: string; match_score?: number };
const metaOf = (s: Source) => (s.raw_metadata_json ?? {}) as Meta;

// Tab categories, in priority order. `test` runs against the document description.
const CATEGORIES: { key: string; label: string; test: (desc: string) => boolean }[] = [
  { key: 'floor', label: 'Floor plans', test: (d) => /floor ?plan/i.test(d) },
  { key: 'elevation', label: 'Elevations & sections', test: (d) => /elevation|section/i.test(d) },
  { key: 'site', label: 'Site & location', test: (d) => /site plan|block plan|location plan|general arrangement/i.test(d) },
  { key: 'other', label: 'Other drawings', test: () => true },
];

export default function PlanningDocs({
  sources,
  onSearch,
  searching,
  searched,
}: {
  sources: Source[];
  onSearch: () => void;
  searching: boolean;
  searched: boolean;
}) {
  // Build the tab groups: one per non-empty document category, plus an "Applications" tab.
  const tabs = useMemo(() => {
    const pdfs = sources.filter((s) => metaOf(s).kind !== 'application');
    const apps = sources.filter((s) => metaOf(s).kind === 'application');
    const used = new Set<string>();
    const groups: { key: string; label: string; items: Source[]; isApp?: boolean }[] = [];
    for (const cat of CATEGORIES) {
      const items = pdfs.filter((s) => !used.has(s.id) && cat.test(metaOf(s).description ?? ''));
      items.forEach((s) => used.add(s.id));
      if (items.length) groups.push({ key: cat.key, label: `${cat.label} (${items.length})`, items });
    }
    if (apps.length) groups.push({ key: 'apps', label: `Applications (${apps.length})`, items: apps, isApp: true });
    return groups;
  }, [sources]);

  const [active, setActive] = useState(0);
  const current = tabs[Math.min(active, Math.max(0, tabs.length - 1))];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-900">Planning floorplans</h2>
        <button
          onClick={onSearch}
          disabled={searching}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {searching ? 'Searching…' : sources.length > 0 ? 'Search again' : 'Find floorplans'}
        </button>
      </div>

      {searching ? (
        <div className="space-y-2.5 pt-1">
          <Skeleton className="h-3 w-56" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ) : sources.length === 0 ? (
        <p className="text-sm text-slate-500">
          {searched
            ? 'No planning documents were found for this address in council planning records.'
            : 'Search council planning records (all UK councils) for floorplan documents linked to this address.'}
        </p>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex flex-wrap gap-1 border-b border-gray-200 -mb-px">
            {tabs.map((t, i) => (
              <button
                key={t.key}
                onClick={() => setActive(i)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  i === active
                    ? 'text-primary border-primary'
                    : 'text-slate-600 border-transparent hover:text-primary hover:border-primary/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <ul className="text-sm divide-y divide-gray-100 mt-2">
            {current?.items.map((d) => {
              const meta = metaOf(d);
              return (
                <li key={d.id} className="py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-slate-700 truncate">
                      {meta.description || (current.isApp ? 'Planning application' : 'Plan document')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {d.source_name ?? 'Council'}
                      {typeof meta.match_score === 'number' && meta.match_score > 0 && ` · match ${meta.match_score}`}
                    </div>
                  </div>
                  {d.source_url &&
                    (current.isApp ? (
                      <a
                        href={d.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-primary shrink-0"
                      >
                        View application ↗
                      </a>
                    ) : (
                      <a
                        href={`/api/evidence-harvester/floorplan-file/${d.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-primary shrink-0"
                      >
                        Open PDF ↗
                      </a>
                    ))}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="text-[11px] text-slate-400 mt-2">
        Candidate documents from public council planning records — they may relate to the building or a
        neighbouring unit rather than this exact property. Verify before relying on them.
      </p>
    </div>
  );
}
