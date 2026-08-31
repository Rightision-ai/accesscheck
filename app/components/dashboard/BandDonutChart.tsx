"use client";

import React, { useState } from "react";
import type { BandSlice } from "@/lib/assessments/analytics";

/**
 * Share of assessments per Accessible Housing Rules band.
 *
 * The band colours come from band-definitions.json and are deliberately not restyled —
 * a band must read the same here as on its badge, in the report and in the PDF. They form
 * an ordered green-to-red ramp, so neighbouring bands are close in hue; identity is
 * therefore carried by the band letter and the legend, never by colour alone.
 */

const SURFACE = "#ffffff";
// Geometry: r=72 with a 26px stroke gives a 59–85px ring inside a 200×200 box.
const RADIUS = 72;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Surface-coloured gap between touching segments, per the mark spec. */
const GAP = 2;

export default function BandDonutChart({ slices }: { slices: BandSlice[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        No banded assessments yet. Bands appear here once assessments are graded.
      </p>
    );
  }

  const active = hovered === null ? null : slices[hovered];
  const share = (count: number) => (count / total) * 100;

  // Lay the segments out clockwise from twelve o'clock. Each arc's start is the running
  // total of everything before it (the list is at most nine bands, so the repeated sum
  // costs nothing and keeps this a pure render).
  const arcs = slices.map((slice, index) => {
    const precedingCount = slices
      .slice(0, index)
      .reduce((sum, earlier) => sum + earlier.count, 0);
    const length = (slice.count / total) * CIRCUMFERENCE;
    // A single slice covering everything has no neighbour to be separated from.
    const dash = slices.length === 1 ? length : Math.max(length - GAP, 0.5);
    return {
      slice,
      index,
      dash,
      offset: (precedingCount / total) * CIRCUMFERENCE,
    };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg
          viewBox="0 0 200 200"
          className="h-54 w-54 -rotate-90"
          role="img"
          aria-label={`Assessments by accessibility band. ${slices
            .map((slice) => `${bandName(slice)}: ${slice.count}`)
            .join(", ")}.`}
        >
          {arcs.map(({ slice, index, dash, offset: arcOffset }) => (
            <circle
              key={slice.band ?? "unbanded"}
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              stroke={slice.colour}
              strokeWidth={hovered === index ? STROKE + 6 : STROKE}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={-arcOffset}
              className="cursor-default transition-[stroke-width] duration-150"
              // Recede the rest just enough to lift the hovered band out; dimming harder
              // than this washes the whole ring out and hides the distribution.
              opacity={hovered === null || hovered === index ? 1 : 0.72}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              <title>{`${bandName(slice)} — ${slice.count} (${share(slice.count).toFixed(0)}%)`}</title>
            </circle>
          ))}
        </svg>

        {/* Centre reading: the total, or the hovered band's numbers. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {active ? (
            <>
              <span className="text-3xl font-extrabold leading-none text-slate-950">
                {active.count}
              </span>
              <span className="mt-1 px-6 text-xs font-bold uppercase tracking-wide text-slate-500">
                {active.band ? `Band ${active.band}` : active.label}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {share(active.count).toFixed(0)}% of stock
              </span>
            </>
          ) : (
            <>
              <span className="text-3xl font-extrabold leading-none text-slate-950">
                {total}
              </span>
              <span className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                Assessments
              </span>
            </>
          )}
        </div>
      </div>

      {/* The legend doubles as the table view: every band, its count and its share. */}
      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((slice, index) => (
          <li
            key={slice.band ?? "unbanded"}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1 transition-colors ${
              hovered === index ? "bg-slate-50" : ""
            }`}
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.colour, boxShadow: `0 0 0 2px ${SURFACE}` }}
            />
            <span className="w-7 shrink-0 text-sm font-extrabold text-slate-900">
              {slice.band ?? "—"}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
              {slice.label}
            </span>
            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700">
              {slice.count}
            </span>
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-400">
              {share(slice.count).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function bandName(slice: BandSlice): string {
  return slice.band ? `Band ${slice.band} — ${slice.label}` : slice.label;
}
