import React from "react";
import { Clock, FileText, Shield, type LucideIcon } from "lucide-react";
import { assessmentStatusMeta, normalizeAssessmentStatus } from "@/lib/assessments/status";
import type { AssessmentStatus } from "@/types/accesscheck";
import { cn } from "@/lib/utils/cn";

export const ASSESSMENT_STATUS_ICONS: Record<AssessmentStatus, LucideIcon> = {
  draft: FileText,
  review: Clock,
  complete: Shield,
};


/**
 * The one status pill. Used by the case cards, the assessments table and the case header
 * so a status always reads the same colour wherever it appears.
 */
export default function AssessmentStatusBadge({
  status,
  className,
  size = "md",
}: {
  status: unknown;
  className?: string;
  size?: "sm" | "md";
}) {
  const meta = assessmentStatusMeta(status);
  // Indexed rather than returned from a helper so React sees a stable component type.
  const Icon = ASSESSMENT_STATUS_ICONS[normalizeAssessmentStatus(status)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border font-bold uppercase tracking-wider",
        size === "sm" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]",
        meta.badge,
        className,
      )}
    >
      <Icon size={size === "sm" ? 12 : 14} className="shrink-0" />
      {meta.label}
    </span>
  );
}
