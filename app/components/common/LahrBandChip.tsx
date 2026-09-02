import React from "react";
import { LAHR_BAND_BY_ID, type LahrBandId } from "@/lib/accessibility/lahr/types";
import { cn } from "@/lib/utils/cn";

interface LahrBandChipProps {
  band: LahrBandId;
  /** Shows the band's plain-English name beside the letter. */
  showLabel?: boolean;
  className?: string;
}

/**
 * The compact form of LahrBandBadge. The badge draws the whole A–F scale (~296px) and does
 * not fit in a table cell, so lists use this instead — same letter, same colour, same band
 * definition, so a case reads identically in the assessments table and on its detail page.
 */
const LahrBandChip: React.FC<LahrBandChipProps> = ({
  band,
  showLabel = true,
  className,
}) => {
  const def = LAHR_BAND_BY_ID[band];

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={`Accessible Housing Rules band ${band} — ${def.label}`}
    >
      {/* min-w rather than a fixed width so "E+" is not clipped. */}
      <span
        className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-black text-white"
        style={{ backgroundColor: def.color }}
      >
        {band}
      </span>
      {showLabel && (
        <span className="min-w-0 truncate text-xs font-medium text-slate-600">
          {def.label}
        </span>
      )}
    </span>
  );
};

export default LahrBandChip;
