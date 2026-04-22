import React from "react";
import { LAHR_BAND_BY_ID, type LahrBandId } from "@/lib/accessibility/lahr/types";
import { cn } from "@/lib/utils/cn";

interface LahrBandBadgeProps {
  band: LahrBandId;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showDescription?: boolean;
  className?: string;
}

const SIZE = {
  sm: {
    pillPad: "px-2 py-1.5 gap-1",
    dot: "w-6 h-6 text-[10px]",
    dotActive: "w-7 h-7 text-xs",
    label: "text-[9px] tracking-[0.15em] px-1.5",
    labelOffset: "-mt-[7px]",
    connector: "w-2",
    borderW: 1.5,
  },
  md: {
    pillPad: "px-3 py-2 gap-1.5",
    dot: "w-8 h-8 text-xs",
    dotActive: "w-10 h-10 text-sm",
    label: "text-[10px] tracking-[0.2em] px-2",
    labelOffset: "-mt-[9px]",
    connector: "w-3",
    borderW: 2,
  },
  lg: {
    pillPad: "px-4 py-2.5 gap-2",
    dot: "w-10 h-10 text-sm",
    dotActive: "w-12 h-12 text-base",
    label: "text-xs tracking-[0.2em] px-2.5",
    labelOffset: "-mt-[10px]",
    connector: "w-4",
    borderW: 2,
  },
};

// Visible bands in the pill (G is the sentinel and shown only when active).
const VISIBLE_BANDS: LahrBandId[] = ["A", "B", "C", "D", "E", "E+", "F"];

const LahrBandBadge: React.FC<LahrBandBadgeProps> = ({
  band,
  size = "md",
  showLabel = true,
  showDescription = false,
  className,
}) => {
  const sizing = SIZE[size];
  const def = LAHR_BAND_BY_ID[band];
  const isSentinel = band === "G";
  const strokeColor = "#0f172a";

  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <div
        className={cn(
          "inline-flex items-center bg-white rounded-full",
          sizing.pillPad,
        )}
        style={{ border: `${sizing.borderW}px solid ${strokeColor}` }}
      >
        {(isSentinel ? ["G"] : VISIBLE_BANDS).map((g) => {
          const isActive = g === band;
          const color = LAHR_BAND_BY_ID[g as LahrBandId]?.color ?? "#cbd5e1";
          return (
            <div
              key={g}
              className={cn(
                "rounded-full flex items-center justify-center font-black transition-all shrink-0",
                isActive ? sizing.dotActive : sizing.dot,
                isActive ? "text-white" : "text-slate-300",
              )}
              style={{
                backgroundColor: isActive ? color : "transparent",
                border: isActive ? "none" : "2px solid #cbd5e1",
              }}
              aria-label={isActive ? `LAHR band ${g}` : undefined}
              title={isActive ? def?.label : g}
            >
              {g}
            </div>
          );
        })}
      </div>

      {showLabel && (
        <div className={cn("flex items-center", sizing.labelOffset)}>
          <span
            className={cn("shrink-0", sizing.connector)}
            style={{ borderBottom: `${sizing.borderW}px solid ${strokeColor}` }}
          />
          <span
            className={cn(
              "bg-white font-black text-slate-900 uppercase",
              sizing.label,
            )}
          >
            ACCESSIBILITY
          </span>
          <span
            className={cn("shrink-0", sizing.connector)}
            style={{ borderBottom: `${sizing.borderW}px solid ${strokeColor}` }}
          />
        </div>
      )}

      {showDescription && def?.description && (
        <p className="mt-1 max-w-xs text-center text-[11px] text-slate-600">
          {def.description}
        </p>
      )}
    </div>
  );
};

export default LahrBandBadge;
