import React, { useMemo, useState } from "react";
import { Loader2, ExternalLink, CheckCircle, Download } from "lucide-react";

export type PlanningSource = {
  id: string;
  source_name: string | null;
  source_url: string | null;
  raw_metadata_json?: Record<string, unknown> | null;
};

type Meta = { kind?: string; description?: string; match_score?: number };
const metaOf = (s: PlanningSource) => (s.raw_metadata_json ?? {}) as Meta;

// Tab categories, in priority order. `test` runs against the document description.
const CATEGORIES: { key: string; label: string; test: (desc: string) => boolean }[] = [
  { key: "floor", label: "Floor plans", test: (d) => /floor ?plan/i.test(d) },
  { key: "elevation", label: "Elevations & sections", test: (d) => /elevation|section/i.test(d) },
  {
    key: "site",
    label: "Site & location",
    test: (d) => /site plan|block plan|location plan|general arrangement/i.test(d),
  },
  { key: "other", label: "Other drawings", test: () => true },
];

/**
 * Presentational list of planning-portal documents found for a property, grouped
 * into tabs. Each PDF can be opened in a new tab, and selected as the floor plan
 * (which runs it through the same detection pipeline as a manual upload).
 */
export default function PlanningDocList({
  sources,
  selectedSourceId,
  selectingId,
  onSelect,
}: {
  sources: PlanningSource[];
  selectedSourceId?: string | null;
  selectingId?: string | null;
  onSelect: (sourceId: string, description?: string) => void;
}) {
  const tabs = useMemo(() => {
    const pdfs = sources.filter((s) => metaOf(s).kind !== "application");
    const apps = sources.filter((s) => metaOf(s).kind === "application");
    const used = new Set<string>();
    const groups: {
      key: string;
      label: string;
      items: PlanningSource[];
      isApp?: boolean;
    }[] = [];
    for (const cat of CATEGORIES) {
      const items = pdfs.filter(
        (s) => !used.has(s.id) && cat.test(metaOf(s).description ?? ""),
      );
      items.forEach((s) => used.add(s.id));
      if (items.length)
        groups.push({ key: cat.key, label: `${cat.label} (${items.length})`, items });
    }
    if (apps.length)
      groups.push({ key: "apps", label: `Applications (${apps.length})`, items: apps, isApp: true });
    return groups;
  }, [sources]);

  const [active, setActive] = useState(0);
  const current = tabs[Math.min(active, Math.max(0, tabs.length - 1))];

  return (
    <div className="rounded-2xl border border-border bg-white p-4 text-left">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 -mb-px">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(i)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              i === active
                ? "text-primary border-primary"
                : "text-slate-600 border-transparent hover:text-primary hover:border-primary/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="text-sm divide-y divide-slate-100 mt-2">
        {current?.items.map((d) => {
          const meta = metaOf(d);
          const isSelected = selectedSourceId === d.id;
          const isBusy = selectingId === d.id;
          const fileHref = `/api/evidence-harvester/floorplan-file/${d.id}`;
          return (
            <li key={d.id} className="py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-slate-700 truncate">
                  {meta.description ||
                    (current.isApp ? "Planning application" : "Plan document")}
                </div>
                <div className="text-xs text-slate-400">
                  {d.source_name ?? "Council"}
                  {typeof meta.match_score === "number" &&
                    meta.match_score > 0 &&
                    ` · match ${meta.match_score}`}
                </div>
              </div>

              {d.source_url && (
                <div className="flex items-center gap-2 shrink-0">
                  {current.isApp ? (
                    <a
                      href={d.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                    >
                      View application <ExternalLink size={12} />
                    </a>
                  ) : (
                    <>
                      <a
                        href={fileHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        title="Open PDF in a new tab"
                      >
                        Open <ExternalLink size={12} />
                      </a>
                      <a
                        href={fileHref}
                        download
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        title="Download PDF"
                      >
                        <Download size={12} />
                      </a>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onSelect(d.id, meta.description)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-60 ${
                          isSelected
                            ? "bg-green-100 text-green-700"
                            : "bg-primary text-white hover:bg-primary/90"
                        }`}
                      >
                        {isBusy ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : isSelected ? (
                          <CheckCircle size={12} />
                        ) : null}
                        {isSelected ? "Selected" : "Use as floor plan"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-slate-400 mt-2">
        Candidate documents from public council planning records — they may relate to the
        building or a neighbouring unit rather than this exact property. Verify before relying
        on them.
      </p>
    </div>
  );
}
