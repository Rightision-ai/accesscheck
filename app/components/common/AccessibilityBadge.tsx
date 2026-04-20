import React from "react";
import {
  AccessibilityGrade,
  LEGEND,
} from "@/lib/accessibility/flowchart";
import { cn } from "@/lib/utils/cn";

interface AccessibilityBadgeProps {
  grade: AccessibilityGrade;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const GRADES: AccessibilityGrade[] = ["A+", "A-", "B+", "B-", "C"];

const SIZE = {
  sm: {
    pill: "px-2 py-1.5 gap-1",
    dot: "w-6 h-6 text-[10px]",
    dotActive: "w-7 h-7 text-xs",
    label: "text-[9px] tracking-[0.15em]",
    border: "border",
  },
  md: {
    pill: "px-3 py-2 gap-1.5",
    dot: "w-8 h-8 text-xs",
    dotActive: "w-10 h-10 text-sm",
    label: "text-[10px] tracking-[0.2em]",
    border: "border-2",
  },
  lg: {
    pill: "px-4 py-2.5 gap-2",
    dot: "w-10 h-10 text-sm",
    dotActive: "w-12 h-12 text-base",
    label: "text-xs tracking-[0.2em]",
    border: "border-2",
  },
};

const AccessibilityBadge: React.FC<AccessibilityBadgeProps> = ({
  grade,
  size = "md",
  showLabel = true,
  className,
}) => {
  const sizing = SIZE[size];
  const activeColor = LEGEND[grade].color;

  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <div
        className={cn(
          "inline-flex items-center bg-white rounded-full border-slate-900",
          sizing.pill,
          sizing.border,
        )}
      >
        {GRADES.map((g) => {
          const isActive = g === grade;
          return (
            <div
              key={g}
              className={cn(
                "rounded-full flex items-center justify-center font-black transition-all shrink-0",
                isActive ? sizing.dotActive : sizing.dot,
                isActive ? "text-white" : "text-slate-300",
              )}
              style={{
                backgroundColor: isActive ? activeColor : "transparent",
                border: isActive ? "none" : "2px solid #cbd5e1",
              }}
              aria-label={
                isActive ? `Accessibility grade ${g}` : undefined
              }
            >
              {g}
            </div>
          );
        })}
      </div>
      {showLabel && (
        <div
          className={cn(
            "mt-1.5 font-black text-slate-900 uppercase",
            sizing.label,
          )}
        >
          ACCESSIBILITY
        </div>
      )}
    </div>
  );
};

export default AccessibilityBadge;
