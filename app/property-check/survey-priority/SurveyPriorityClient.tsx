"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  Badge,
  Confidence,
  SkeletonRows,
  Spinner,
} from "@/app/components/property-check/ui";

export type SurveyRow = {
  property_id: string;
  address: string;
  postcode: string;
  property_type: string | null;
  created_at: string | null;
  evidence_status: string;
  overall_confidence: number | null;
  recommended_action: string | null;
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "auto_assessable", label: "Auto-assessable" },
  { value: "exterior_only", label: "Exterior only" },
  { value: "data_enriched_only", label: "Data enriched only" },
  { value: "needs_manual_survey", label: "Needs manual survey" },
  { value: "no_useful_evidence", label: "No useful evidence" },
];

type SortKey = "date" | "confidence";

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Page numbers with ellipsis: 1 … 4 5 6 … 20 */
function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}

function Pager({
  current,
  pageCount,
  total,
  pageSize,
  onChange,
}: {
  current: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span className="text-xs text-slate-500">
        Showing {(current - 1) * pageSize + 1}–
        {Math.min(current * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(current - 1)}
          disabled={current <= 1}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-primary disabled:opacity-40"
        >
          ‹
        </button>
        {pageNumbers(current, pageCount).map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-2 text-xs text-slate-400">
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`min-w-8 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                n === current
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200 text-slate-700 hover:border-primary"
              }`}
            >
              {n}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(current + 1)}
          disabled={current >= pageCount}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-primary disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export default function SurveyPriorityClient({
  initialRows,
}: {
  initialRows: SurveyRow[];
}) {
  const [rows, setRows] = useState<SurveyRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [deleting, setDeleting] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (status && r.evidence_status !== status) return false;
      if (q && !`${r.address} ${r.postcode}`.toLowerCase().includes(q))
        return false;
      return true;
    });
    out = [...out].sort((a, b) =>
      sort === "date"
        ? (b.created_at ?? "").localeCompare(a.created_at ?? "")
        : (b.overall_confidence ?? 0) - (a.overall_confidence ?? 0),
    );
    return out;
  }, [rows, search, status, sort]);

  // Pagination — 10 records per page; reset to page 1 whenever the filtered set changes.
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [paging, setPaging] = useState(false);
  useEffect(() => setPage(1), [search, status, sort]);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = visible.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Brief loading state when switching pages so the change is visible.
  function goToPage(p: number) {
    const next = Math.min(pageCount, Math.max(1, p));
    if (next === currentPage) return;
    setPaging(true);
    setPage(next);
    setTimeout(() => setPaging(false), 250);
  }

  async function onDelete(propertyId: string) {
    if (
      !confirm("Delete this property and its evidence? This cannot be undone.")
    )
      return;
    setDeleting(propertyId);
    const res = await fetch(
      `/api/evidence-harvester/properties/${propertyId}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.property_id !== propertyId));
    } else {
      alert("Could not delete this property.");
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Property List</h1>
        <p className="text-sm text-slate-500 mt-1">
          All checked properties, newest first. Filter, search and prioritise
          manual surveys where they add the most value.
        </p>
      </div>

      {/* Controls: search + sort */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search address or postcode…"
          className="flex-1 min-w-[220px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="date">Newest first</option>
          <option value="confidence">Highest confidence</option>
        </select>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${
              status === f.value
                ? "border-primary bg-primary-light text-primary"
                : "border-gray-200 text-slate-600 hover:border-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Pagination — on top */}
      {visible.length > PAGE_SIZE && (
        <Pager
          current={currentPage}
          pageCount={pageCount}
          total={visible.length}
          pageSize={PAGE_SIZE}
          onChange={goToPage}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">Date added</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Postcode</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Evidence Status</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Recommended Action</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {paging ? (
              <SkeletonRows rows={Math.min(PAGE_SIZE, paged.length || PAGE_SIZE)} cols={8} />
            ) : visible.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  {rows.length === 0
                    ? "No checked properties yet."
                    : "No properties match your filters."}
                </td>
              </tr>
            ) : (
              paged.map((r) => (
                <tr key={r.property_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {fmtDate(r.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-[220px] truncate">
                    {r.address}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.postcode}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {r.property_type ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={r.evidence_status} />
                  </td>
                  <td className="px-4 py-3">
                    <Confidence value={r.overall_confidence} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">
                    {r.recommended_action ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/properties/${r.property_id}/evidence`}
                      className="text-xs font-bold text-primary"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => onDelete(r.property_id)}
                      disabled={deleting === r.property_id}
                      title="Delete property"
                      className="ml-3 inline-flex items-center text-slate-400 hover:text-rose-600 disabled:opacity-50"
                    >
                      {deleting === r.property_id ? <Spinner className="h-4 w-4" /> : <Trash2 size={16} />}
                    </button>
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
