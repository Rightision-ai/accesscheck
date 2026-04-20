"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Calendar,
  FileText,
  Shield,
  Clock,
  ChevronRight,
  ImageOff,
} from "lucide-react";
import { Case } from "@/types/dashboard";
import { cn } from "@/lib/utils/cn";

interface CaseCardProps {
  caseData: Case;
  onClick: (id: string) => void;
}

const CaseCard: React.FC<CaseCardProps> = ({ caseData, onClick }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Pending":
        return {
          icon: Clock,
          className: "bg-orange-50 text-orange-600 border-orange-200",
          label: "In Progress",
        };
      case "Completed":
        return {
          icon: Shield,
          className: "bg-emerald-50 text-emerald-600 border-emerald-200",
          label: "Finalized",
        };
      case "Review":
        return {
          icon: Clock,
          className: "bg-amber-50 text-amber-600 border-amber-200",
          label: "In Review",
        };
      case "Draft":
        return {
          icon: FileText,
          className: "bg-slate-50 text-slate-500 border-slate-200",
          label: "Draft",
        };
      default:
        return {
          icon: FileText,
          className: "bg-slate-50 text-slate-500 border-slate-200",
          label: status,
        };
    }
  };

  const statusConfig = getStatusConfig(caseData.status);
  const StatusIcon = statusConfig.icon;
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
    <motion.div
      whileHover={{ translateY: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
      onClick={() => onClick(caseData.id)}
      className="cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-200 transition-all duration-300 relative"
    >
      {/* Property Image */}
      <div className="relative h-[140px] overflow-hidden">
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
            statusConfig.className,
          )}
        >
          <StatusIcon size={14} className="shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Address */}
        <h3 className="text-base font-bold text-slate-900 mb-1 leading-tight">
          {caseData.address || "Address Pending"}
        </h3>

        {/* Inspector Name */}
        <div className="mb-3">
          <div className="text-xs text-slate-600 font-medium mt-0.5">
            {caseData.applicantName || "Unknown"}
          </div>
        </div>

        {/* Bottom meta + action */}
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
              <MapPin size={14} />
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
