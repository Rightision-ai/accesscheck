"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Weekly started/completed volume.
 *
 * Hover behaves like the band donut next to it: the week under the pointer lifts and
 * reports its numbers, the rest recede just enough to let it stand out. The readout sits
 * in the card header rather than floating over the bars, so a short column's figures are
 * as readable as a tall one's. Every column is focusable, so the same reading is reachable
 * from the keyboard.
 */

export type TrendWeek = { week: string; started: number; completed: number };

const STARTED = "bg-blue-300";
const COMPLETED = "bg-emerald-500";

export default function WeeklyTrendChart({ weeks }: { weeks: TrendWeek[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...weeks.flatMap((week) => [week.started, week.completed]));
  const active = hovered === null ? null : weeks[hovered];
  const totals = weeks.reduce(
    (sum, week) => ({
      started: sum.started + week.started,
      completed: sum.completed + week.completed,
    }),
    { started: 0, completed: 0 },
  );

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="font-bold text-slate-950">Started and completed</h2>
        <p className="text-sm font-bold tabular-nums text-slate-700">
          <span className="text-blue-600">{active ? active.started : totals.started}</span>
          <span className="px-1 font-normal text-slate-300">/</span>
          <span className="text-emerald-600">{active ? active.completed : totals.completed}</span>
        </p>
      </div>
      <p className="mb-5 text-sm text-slate-500">
        {active ? `Week of ${weekLabel(active.week, "long")}` : `Weekly assessment activity · last ${weeks.length} weeks`}
      </p>

      <div
        className="flex h-52 items-end gap-1"
        role="img"
        aria-label="Weekly assessments started and completed"
      >
        {weeks.map((week, index) => {
          const isActive = hovered === index;
          return (
            <div
              key={week.week}
              tabIndex={0}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              className={cn(
                "flex min-w-0 flex-1 cursor-default flex-col items-center gap-1.5 rounded-lg px-0.5 pt-1 pb-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isActive && "bg-slate-50",
              )}
            >
              {/* Fixed-height slot so revealing the numbers never nudges the bars. */}
              <div
                className={cn(
                  "flex h-4 items-center gap-1 text-[11px] font-extrabold tabular-nums transition-opacity duration-150",
                  isActive ? "opacity-100" : "opacity-0",
                )}
                aria-hidden="true"
              >
                <span className="text-blue-600">{week.started}</span>
                <span className="font-normal text-slate-300">/</span>
                <span className="text-emerald-600">{week.completed}</span>
              </div>
              <div
                className={cn(
                  "flex h-36 w-full items-end justify-center gap-1 transition-opacity duration-150",
                  // Recede the other weeks just enough to lift this one out, matching the donut.
                  hovered === null || isActive ? "opacity-100" : "opacity-70",
                )}
              >
                <Bar value={week.started} max={max} colour={STARTED} grown={isActive} />
                <Bar value={week.completed} max={max} colour={COMPLETED} grown={isActive} />
              </div>
              <span
                className={cn(
                  "truncate text-[10px] transition-colors",
                  isActive ? "font-bold text-slate-600" : "text-slate-400",
                )}
              >
                {weekLabel(week.week)}
              </span>
              <span className="sr-only">
                {weekLabel(week.week, "long")}: {week.started} started and {week.completed} completed
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span className="text-blue-600">■ Started</span>
        <span className="text-emerald-600">■ Completed</span>
      </div>
    </>
  );
}

function Bar({
  value,
  max,
  colour,
  grown,
}: {
  value: number;
  max: number;
  colour: string;
  grown: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-t transition-[width,height] duration-150",
        colour,
        grown ? "w-1/2" : "w-2/5",
      )}
      // A 3% floor keeps an empty week visible as a baseline tick rather than nothing at all.
      style={{ height: `${Math.max(3, (value / max) * 100)}%` }}
    />
  );
}

function weekLabel(week: string, length: "short" | "long" = "short"): string {
  return new Date(week).toLocaleDateString("en-GB", {
    day: "numeric",
    month: length === "long" ? "long" : "short",
    ...(length === "long" ? { year: "numeric" as const } : {}),
  });
}
