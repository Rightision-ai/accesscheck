"use client";

import React, { useMemo, useState } from "react";
import { classifyLahr } from "@/lib/accessibility/lahr/classifier";
import {
  LAHR_BAND_BY_ID,
  type CriterionResult,
  type LahrBandId,
} from "@/lib/accessibility/lahr/types";
import type { Database } from "@/types/supabase";
import AnnotatedImage, { type Annotation } from "./AnnotatedImage";

type SurveyRow = Database["public"]["Tables"]["surveys"]["Row"];

type SurveyAnnotationRow = {
  id: string | number;
  image_id: string;
  image_url?: string | null;
  object_class: string;
  label: string;
  value_text?: string | null;
  bbox: [number, number, number, number];
  polygon?: [number, number][] | null;
  confidence: number;
  criterion_id?: string | null;
  color: string;
};

type Props = {
  survey: Partial<SurveyRow> | null | undefined;
  annotations?: SurveyAnnotationRow[];
  floorPlanUrl?: string | null;
  evidenceUrls?: string[];
};

const STATUS_COLOR: Record<string, string> = {
  pass: "text-emerald-700 bg-emerald-50 border-emerald-200",
  partial: "text-amber-700 bg-amber-50 border-amber-200",
  fail: "text-rose-700 bg-rose-50 border-rose-200",
  unknown: "text-slate-600 bg-slate-50 border-slate-200",
};

export default function LahrAppendix({
  survey,
  annotations = [],
  floorPlanUrl,
  evidenceUrls = [],
}: Props) {
  const evaluation = useMemo(() => classifyLahr(survey ?? {}), [survey]);
  const [activeCriterion, setActiveCriterion] = useState<string | null>(null);

  const byImage = useMemo(() => {
    const grouped = new Map<string, SurveyAnnotationRow[]>();
    for (const a of annotations) {
      if (!grouped.has(a.image_id)) grouped.set(a.image_id, []);
      grouped.get(a.image_id)!.push(a);
    }
    return grouped;
  }, [annotations]);

  const renderAnnotations = (rows: SurveyAnnotationRow[]): Annotation[] =>
    rows.map((r) => ({
      id: String(r.id),
      bbox: r.bbox,
      polygon: r.polygon ?? undefined,
      label: r.label,
      valueText: r.value_text ?? undefined,
      criterionId: r.criterion_id ?? undefined,
      confidence: r.confidence,
      color: r.color,
    }));

  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-5">
      {evaluation.gTriggered && (() => {
        const gResult = evaluation.criteria.find((c) => c.id === "g_rules");
        if (!gResult || gResult.triggeredRules.length === 0) return null;
        return (
          <section className="rounded border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Recommendations for better assessment
            </h3>
            <p className="mt-1 text-[11px] text-amber-700">
              The following items were flagged as missing or unclear. Capturing
              them in a future survey will sharpen the band.
            </p>
            <ul className="mt-2 space-y-1 text-[11px] text-amber-900">
              {gResult.triggeredRules.map((r) => (
                <li key={r.n} className="flex gap-2">
                  <span className="font-semibold">#{r.n}</span>
                  <span>{r.description}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Section results
        </h3>
        <div className="overflow-hidden rounded border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2 text-left font-semibold">Section</th>
                <th className="p-2 text-left font-semibold">Cap</th>
                <th className="p-2 text-left font-semibold">Status</th>
                <th className="p-2 text-left font-semibold">Triggered rules</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.criteria
                .filter((c) => c.id !== "g_rules")
                .map((c) => (
                  <CriterionRow key={c.id} criterion={c} />
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {floorPlanUrl && (
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Floor plan — detected
          </h3>
          <AnnotatedImage
            src={floorPlanUrl}
            annotations={renderAnnotations(byImage.get("floor-plan") ?? [])}
            highlightedId={activeCriterion ?? undefined}
            onAnnotationClick={(a) => setActiveCriterion(a.criterionId ?? null)}
          />
        </section>
      )}

      {evidenceUrls.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Evidence — annotated
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {evidenceUrls.map((url, i) => {
              const key = `photo-${i}`;
              const rows = byImage.get(key) ?? [];
              return (
                <div key={url} className="space-y-1">
                  <AnnotatedImage
                    src={url}
                    annotations={renderAnnotations(rows)}
                    highlightedId={activeCriterion ?? undefined}
                    onAnnotationClick={(a) =>
                      setActiveCriterion(a.criterionId ?? null)
                    }
                  />
                  <p className="text-[10px] text-slate-500">
                    {rows.length} detection{rows.length === 1 ? "" : "s"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <LahrBandsLegend band={evaluation.band} />
    </div>
  );
}

function CriterionRow({ criterion }: { criterion: CriterionResult }) {
  const [open, setOpen] = useState(false);
  const statusClass = STATUS_COLOR[criterion.status] ?? STATUS_COLOR.unknown;
  const cap = criterion.cappedBand;

  return (
    <>
      <tr
        className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="p-2 font-medium text-slate-800">{criterion.label}</td>
        <td className="p-2">
          {cap ? (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
              style={{ backgroundColor: LAHR_BAND_BY_ID[cap].color }}
            >
              {cap}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
        <td className="p-2">
          <span
            className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}
          >
            {criterion.status}
          </span>
        </td>
        <td className="p-2 text-slate-600">
          {criterion.triggeredRules.length}
        </td>
      </tr>
      {open && criterion.triggeredRules.length > 0 && (
        <tr className="bg-slate-50">
          <td colSpan={4} className="p-3">
            <ul className="space-y-1 text-[11px] text-slate-700">
              {criterion.triggeredRules.map((r) => (
                <li key={r.n}>
                  <span className="font-semibold">#{r.n}</span> — {r.description}{" "}
                  <span className="text-slate-500">
                    (caps at{" "}
                    <span
                      className="font-bold"
                      style={{ color: LAHR_BAND_BY_ID[r.capBand].color }}
                    >
                      {r.capBand}
                    </span>
                    )
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-slate-500">{criterion.rationale}</p>
          </td>
        </tr>
      )}
    </>
  );
}

function LahrBandsLegend({ band }: { band: LahrBandId }) {
  const ids: LahrBandId[] = ["A", "B", "C", "D", "E", "E+", "F", "G"];
  return (
    <section className="text-[11px] text-slate-600">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
        Accessible Housing Rules band legend
      </h3>
      <ul className="space-y-1">
        {ids.map((id) => {
          const def = LAHR_BAND_BY_ID[id];
          const active = id === band;
          return (
            <li key={id} className="flex items-start gap-2">
              <span
                className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: def.color }}
              />
              <span>
                <strong style={{ color: def.color }}>
                  {id} — {def.label}
                </strong>{" "}
                {active && <em className="text-violet-700">(current)</em>}
                <span className="block text-slate-500">{def.description}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
