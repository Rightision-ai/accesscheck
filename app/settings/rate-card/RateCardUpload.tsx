"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import type { RateCardCsvIssue } from "@/lib/rate-cards/csv";
import type { RateCardDiff } from "@/lib/rate-cards/diff";
import RateCardDiffTable from "./RateCardDiffTable";

type Validation = {
  ok: boolean;
  errors: RateCardCsvIssue[];
  warnings: RateCardCsvIssue[];
  rowCount: number;
  nextVersion: number;
  diff: RateCardDiff | null;
};

/**
 * Upload → validate → review → publish.
 *
 * The file is never parsed here. The browser posts the raw text and the server is the only
 * parser, so the diff a reviewer approves and the rows that get committed cannot drift — the
 * publish call re-validates the same text rather than trusting anything this component derived.
 */
export default function RateCardUpload({
  canManage,
  currentLabel,
}: {
  canManage: boolean;
  currentLabel: string;
}) {
  const router = useRouter();
  const [csv, setCsv] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [label, setLabel] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [validation, setValidation] = useState<Validation | null>(null);
  // Split rather than one `busy` flag, so the spinner appears on the control the user is
  // actually waiting on — checking a file and publishing it are different waits.
  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const busy = checking || publishing;

  async function onFile(file: File) {
    setChecking(true);
    setValidation(null);
    try {
      const text = await file.text();
      setCsv(text);
      setFilename(file.name);
      if (!label) setLabel(file.name.replace(/\.csv$/i, ""));

      const response = await fetch("/api/rate-cards/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "That file could not be checked.");
        return;
      }
      setValidation(body as Validation);
    } finally {
      setChecking(false);
    }
  }

  async function publish() {
    if (!csv || !validation?.ok) return;
    setPublishing(true);
    try {
      const response = await fetch("/api/rate-cards/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, label, effectiveFrom, filename }),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "That version could not be published.");
        return;
      }
      toast.success(
        `Version ${body.version} published — ${body.itemCount} priced work item${body.itemCount === 1 ? "" : "s"}.` +
          (body.stalePlanCount > 0
            ? ` ${body.stalePlanCount} existing plan${body.stalePlanCount === 1 ? "" : "s"} keep their original prices until regenerated.`
            : ""),
      );
      setCsv(null);
      setValidation(null);
      setFilename("");
      setLabel("");
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  if (!canManage) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">Your own rates</h2>
        <p className="mt-1 text-sm text-slate-500">
          Plans are priced from {currentLabel}. Only an organisation Admin can upload a
          schedule of rates.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-slate-900">Upload your own rates</h2>
      <p className="mt-1 text-sm text-slate-500">
        A CSV of your schedule of rates. Price only the work items you have a framework price
        for — everything you leave out keeps its national rate. Download the template to start
        from the prices in use today.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-green-300 hover:bg-green-50">
          <Upload size={16} />
          {filename || "Choose a CSV file"}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </label>
        <a
          href="/api/rate-cards/template"
          className="text-sm font-bold text-primary-dark no-underline hover:underline"
        >
          Download template
        </a>
        {checking && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500">
            <Loader2 size={16} className="animate-spin text-primary" />
            Checking the file…
          </span>
        )}
      </div>

      {validation && (
        <>
          {validation.errors.length > 0 && (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-rose-800">
                <AlertTriangle size={16} />
                {validation.errors.length} problem
                {validation.errors.length === 1 ? "" : "s"} — nothing has been published
              </div>
              <ul className="mt-2 space-y-1 text-[12px] text-rose-800">
                {validation.errors.map((issue, index) => (
                  <li key={index}>
                    {issue.line !== null && (
                      <span className="font-mono font-bold">Line {issue.line}: </span>
                    )}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
              {validation.warnings.map((issue, index) => (
                <li key={index}>
                  {issue.line !== null && <span className="font-mono">Line {issue.line}: </span>}
                  {issue.message}
                </li>
              ))}
            </ul>
          )}

          {validation.diff && <RateCardDiffTable diff={validation.diff} />}

          {validation.ok && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs font-bold text-slate-600">
                  Version name
                  <input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="e.g. Wolverhampton SOR v3"
                    disabled={publishing}
                    className="mt-1 block h-11 w-64 rounded-xl border border-slate-200 px-3 text-sm font-normal disabled:bg-slate-50"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Effective from
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(event) => setEffectiveFrom(event.target.value)}
                    disabled={publishing}
                    className="mt-1 block h-11 rounded-xl border border-slate-200 px-3 text-sm font-normal disabled:bg-slate-50"
                  />
                </label>
                <button
                  type="button"
                  onClick={publish}
                  disabled={busy || label.trim() === ""}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {publishing && <Loader2 size={16} className="animate-spin" />}
                  {publishing
                    ? "Publishing…"
                    : `Publish version ${validation.nextVersion}`}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                The version name is printed on every plan priced from it, so make it something a
                surveyor would recognise months later.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
