"use client";

import React from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, FileText, Shield, Clock, ChevronRight, Trash2 } from "lucide-react";
import { Case } from "@/types/dashboard";
import { cn } from "@/lib/utils/cn";

interface CaseCardProps {
  caseData: Case;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
}

const CaseCard: React.FC<CaseCardProps> = ({ caseData, onClick, onDelete }) => {
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
  const displayImage =
    caseData.evidence && caseData.evidence.length > 0
      ? caseData.evidence[0]
      : caseData.thumbnail;

  return (
    <motion.div
      whileHover={{ translateY: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
      onClick={() => onClick(caseData.id)}
      className="cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-200 transition-all duration-300 relative"
    >
      {/* Property Image */}
      <div className="relative h-[140px] overflow-hidden">
        <img
          src={
            displayImage ||
            "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80"
          }
          alt={caseData.address}
          className="w-full h-full object-cover"
        />
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

        {/* Applicant Name */}
        <div className="text-xs text-slate-500 mb-3 font-medium">
          {caseData.applicantName || "Anonymous Client"}
        </div>

        {/* Meta Information */}
        <div className="flex gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin size={14} />
            <span>{caseData.city || "Location TBC"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar size={14} />
            <span>
              {caseData.assessmentDate
                ? new Date(caseData.assessmentDate).toLocaleDateString()
                : "Date TBC"}
            </span>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 gap-2">
          {onDelete ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(caseData.id);
              }}
              className="py-2 px-3 rounded-lg text-xs font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer transition-colors flex items-center gap-1.5"
              title="Delete assessment"
              aria-label="Delete assessment"
            >
              <Trash2 size={14} />
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CaseCard;
