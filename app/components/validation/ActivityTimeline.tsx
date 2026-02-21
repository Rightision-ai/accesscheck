import React, { useState } from "react";
import {
  AlertCircle,
  Shield,
  Wrench,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatBritishDateTime } from "@/lib/utils/dateFormatter";
import { cn } from "@/lib/utils/cn";

const TRUNCATE_LENGTH = 200;

interface ObservationEntryProps {
  obs: any;
  idx: number;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Safety Hazard":
      return Shield;
    case "Equipment Required":
      return Wrench;
    case "General Comment":
      return MessageSquare;
    default:
      return AlertCircle;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Accessibility Issue":
      return "#dc2626";
    case "Safety Hazard":
      return "#ea580c";
    case "Equipment Required":
      return "#2563eb";
    case "General Comment":
      return "#059669";
    default:
      return "#6b7280";
  }
};

const ObservationEntry: React.FC<ObservationEntryProps> = ({ obs, idx }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = getCategoryIcon(obs.category);
  const color = getCategoryColor(obs.category);
  const initials =
    obs.authorName
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "?";

  const shouldTruncate = obs.content.length > TRUNCATE_LENGTH;
  const displayContent =
    shouldTruncate && !isExpanded
      ? obs.content.slice(0, TRUNCATE_LENGTH) + "..."
      : obs.content;

  return (
    <div className="flex gap-4 relative">
      <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-extrabold shrink-0 shadow-[0_0_0_4px_#fff,0_2px_8px_rgba(0,0,0,0.1)] z-[1]">
        {initials}
      </div>

      <div className="observation-card flex-1 bg-white rounded-xl border border-border p-4 shadow-sm max-w-full">
        <div className="mb-3">
          <div className="flex justify-between items-start mb-1 flex-wrap gap-2">
            <div>
              <div className="text-sm font-extrabold text-text-main">
                {obs.authorName || "Unknown"}
              </div>
              <div className="text-xs text-text-dim font-semibold">
                {obs.authorRole || "OT"}
              </div>
            </div>
            <div className="text-[11px] text-text-dim font-semibold text-right">
              {formatBritishDateTime(obs.createdAt).replace(",", " -")}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap mt-2">
            <div
              className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md"
              style={{ background: `${color}15` }}
            >
              <Icon size={12} style={{ color }} />
              <span className="text-[11px] font-extrabold" style={{ color }}>
                {obs.category}
              </span>
            </div>

            <div
              className={cn(
                "inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md border",
                obs.includeInReport
                  ? "bg-emerald-50 border-emerald-500/25"
                  : "bg-slate-50 border-border",
              )}
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  obs.includeInReport ? "bg-emerald-500" : "bg-text-dim",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-extrabold uppercase",
                  obs.includeInReport ? "text-emerald-700" : "text-text-dim",
                )}
              >
                {obs.includeInReport ? "In Report" : "Internal Only"}
              </span>
            </div>
          </div>
        </div>

        <p className="observation-content text-xs leading-relaxed text-text-main m-0 break-words">
          {displayContent}
        </p>

        {shouldTruncate && (
          <button
            className="read-more-btn no-print mt-3 py-1.5 px-3 rounded-md bg-slate-50 border border-border text-[11px] font-bold text-primary cursor-pointer transition-all flex items-center gap-1 hover:bg-primary hover:text-white"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} /> Show Less
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Read More
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

interface ActivityTimelineProps {
  observations: any[];
  onAddFollowup: (observationId: string, text: string) => void;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  observations,
  onAddFollowup,
}) => {
  const sortedObservations = [...observations].sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (sortedObservations.length === 0) {
    return (
      <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-border">
        <Clock size={32} className="text-text-dim mb-3" />
        <p className="text-text-dim text-sm font-semibold">
          No observations recorded yet
        </p>
        <p className="text-text-dim text-xs mt-1">
          Click &quot;Add Observation&quot; to record your first professional
          note
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="timeline-line absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-slate-200 to-transparent" />

      <div className="flex flex-col gap-6 w-full max-w-full">
        {sortedObservations.map((obs, idx) => (
          <ObservationEntry key={obs.id || idx} obs={obs} idx={idx} />
        ))}
      </div>

      <style>{`
                @media print {
                    .no-print, .read-more-btn { display: none !important; }
                    .observation-card { page-break-inside: avoid !important; break-inside: avoid !important; }
                    .observation-content { height: auto !important; overflow: visible !important; max-height: none !important; }
                    .timeline-line { display: none !important; }
                }
                @media (max-width: 768px) {
                    .observation-card { padding: 12px !important; }
                }
            `}</style>
    </div>
  );
};

export default ActivityTimeline;
