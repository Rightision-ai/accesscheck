"use client";

import React from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, ChevronRight, ImageOff } from "lucide-react";
import { Case } from "@/types/dashboard";
import { cn } from "@/lib/utils/cn";
import { assessmentStatusMeta, normalizeAssessmentStatus } from "@/lib/assessments/status";
import { ASSESSMENT_STATUS_ICONS } from "@/app/components/common/AssessmentStatusBadge";

interface CaseCardProps {
  caseData: Case;
  onClick: (id: string) => void;
}

const CaseCard: React.FC<CaseCardProps> = ({ caseData, onClick }) => {
  const statusMeta = assessmentStatusMeta(caseData.status);
  const StatusIcon = ASSESSMENT_STATUS_ICONS[normalizeAssessmentStatus(caseData.status)];
  const rawDisplayImage =
    caseData.evidence && caseData.evidence.length > 0
      ? caseData.evidence[0]
      : caseData.thumbnail;
  const displayImage =
    typeof rawDisplayImage === "string" &&
    rawDisplayImage.includes("images.unsplash.com/photo-1586023492125-27b2c045efd7")
      ? ""
      : rawDisplayImage;

  return (
    // h-full + flex-col lets every card in a row stretch to the tallest one, so the meta
    // row below sits on the same line regardless of how long the address is.
    <motion.div
      whileHover={{ translateY: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
      onClick={() => onClick(caseData.id)}
      className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 relative"
    >
      {/* Property Image */}
      <div className="relative h-[140px] shrink-0 overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={caseData.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1 text-slate-400">
              <ImageOff size={28} />
              <span className="text-xs font-medium">No image</span>
            </div>
          </div>
        )}
        <div
          className={cn(
            "absolute top-3 right-3 py-1.5 px-3 rounded-lg flex items-center gap-1.5 border backdrop-blur-md",
            statusMeta.badge,
          )}
        >
          <StatusIcon size={14} className="shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Address — two lines maximum, ellipsised beyond that. min-h reserves the second
            line so single-line addresses still align with their neighbours. */}
        <h3 className="mb-1 min-h-10 text-base font-bold leading-tight text-slate-900 line-clamp-2">
          {caseData.address || "Address Pending"}
        </h3>

        {/* Inspector Name */}
        <div className="mb-3">
          <div className="mt-0.5 truncate text-xs font-medium text-slate-600">
            {caseData.applicantName || "Unknown"}
          </div>
        </div>

        {/* Bottom meta + action — mt-auto pins this to the bottom of the card */}
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">
                {caseData.postcode || "Postcode TBC"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
              <Calendar size={14} />
              <span>
                {caseData.assessmentDate
                  ? new Date(caseData.assessmentDate).toLocaleDateString(
                      "en-GB",
                    )
                  : "Date TBC"}
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CaseCard;
