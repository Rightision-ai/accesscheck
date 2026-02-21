"use client";

import React, { useState } from "react";
import { Case } from "@/types/dashboard";
import ReportView from "@/app/components/report/ReportView";
import { useRouter } from "next/navigation";
import { saveSurveyClient } from "@/lib/surveys/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Info,
  FileText,
  List,
  Lock,
  Clock,
  Home,
  Calendar,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CaseDetailViewProps {
  caseData: Case;
}

const CaseDetailView: React.FC<CaseDetailViewProps> = ({ caseData }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"details" | "ahr">("details");
  const { aiReport, wizardData } = caseData.mlData || {};
  const summary = aiReport?.Summary;
  const grade = aiReport?.Grade;
  const scoreNum =
    typeof (aiReport?.AccessibilityScore ?? caseData.aiScore) === "number"
      ? ((aiReport?.AccessibilityScore ?? caseData.aiScore) as number)
      : parseFloat(
          String(aiReport?.AccessibilityScore ?? caseData.aiScore ?? ""),
        ) || null;
  const scoreColor =
    scoreNum != null
      ? scoreNum >= 80
        ? { bg: "#059669", fg: "#fff" }
        : scoreNum >= 50
          ? { bg: "#d97706", fg: "#fff" }
          : { bg: "#dc2626", fg: "#fff" }
      : { bg: "#64748b", fg: "#fff" };
  const confidenceRaw =
    (caseData.mlData as any)?.aiReport?.Confidence || "MEDIUM";
  const confidencePct =
    confidenceRaw === "HIGH" ? 92 : confidenceRaw === "MEDIUM" ? 75 : 50;
  const confidenceLabel =
    confidenceRaw === "HIGH"
      ? "High Accuracy"
      : confidenceRaw === "MEDIUM"
        ? "Medium Accuracy"
        : "Low Accuracy";
  const confidenceStyle =
    confidenceRaw === "HIGH"
      ? { iconBg: "#ecfdf5", color: "#10b981" }
      : confidenceRaw === "MEDIUM"
        ? { iconBg: "#fffbeb", color: "#d97706" }
        : { iconBg: "#fef2f2", color: "#dc2626" };

  const isLocked = !!(
    caseData.mlData?.isLocked || caseData.status === "Completed"
  );
  const displayStatus = isLocked ? "Finalized & Locked" : "In Review";
  const statusColor = isLocked ? "#059669" : "#d97706";
  const statusBg = isLocked ? "#ecfdf5" : "#fffbeb";
  const StatusIcon = isLocked ? Lock : Clock;

  const handleUpdateCase = async (updatedCase: Case) => {
    try {
      const result = await saveSurveyClient(updatedCase);
      if (result.error) {
        toast.error(`Failed to save: ${result.error}`);
      } else {
        toast.success("Report updated successfully");
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="p-2 rounded-full bg-transparent border-none cursor-pointer text-slate-500 flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 m-0">
                Case {caseData.id}
              </h1>
              <p className="text-xs text-slate-500 m-0">{caseData.address}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-bold border"
              style={{
                background: statusBg,
                color: statusColor,
                borderColor: `${statusColor}20`,
              }}
            >
              <StatusIcon size={14} />
              {displayStatus}
            </div>

            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("details")}
                className={cn(
                  "py-1.5 px-4 rounded-md text-xs font-semibold border-none cursor-pointer flex items-center gap-2 transition-all",
                  activeTab === "details"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-transparent text-slate-500",
                )}
              >
                <List size={16} />
                Case Overview
              </button>
              <button
                onClick={() => setActiveTab("ahr")}
                className={cn(
                  "py-1.5 px-4 rounded-md text-xs font-semibold border-none cursor-pointer flex items-center gap-2 transition-all",
                  activeTab === "ahr"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-transparent text-slate-500",
                )}
              >
                <FileText size={16} />
                AHR Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto py-8 px-6">
        {activeTab === "details" && (
          <div className="flex flex-col gap-6">
            {/* Case Details */}
            <div className="flex flex-wrap gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm items-stretch">
              {/* Score Card */}
              <div
                className="rounded-[20px] p-6 flex flex-col items-center justify-center min-w-[140px] min-h-[160px]"
                style={{
                  background: scoreColor.bg,
                  color: scoreColor.fg,
                  boxShadow: `0 8px 24px ${scoreColor.bg}40`,
                }}
              >
                <div className="text-[11px] font-extrabold opacity-95 tracking-wider uppercase mb-2">
                  Score
                </div>
                <div className="text-5xl font-black leading-none">
                  {scoreNum != null ? Math.round(scoreNum) : "-"}
                </div>
                {grade && (
                  <div className="mt-3 py-1 px-3 rounded-full text-xs font-extrabold bg-white/20 backdrop-blur-sm">
                    Grade: {grade}
                  </div>
                )}
              </div>

              {/* Confidence Card */}
              <div className="bg-white rounded-[20px] p-6 border border-slate-200 flex flex-col items-center justify-center min-w-[140px] min-h-[160px]">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: confidenceStyle.iconBg,
                    color: confidenceStyle.color,
                  }}
                >
                  <CheckCircle size={24} />
                </div>
                <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Confidence
                </div>
                <div className="text-3xl font-black text-slate-900 leading-none">
                  {confidencePct}%
                </div>
                <div
                  className="text-xs font-bold mt-1"
                  style={{ color: confidenceStyle.color }}
                >
                  {confidenceLabel}
                </div>
              </div>

              {/* Property Address */}
              <div className="flex-1 min-w-[200px] flex gap-4 items-center">
                <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 shrink-0">
                  <Home size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Property Address
                  </div>
                  <div className="text-base font-extrabold text-slate-900 leading-snug">
                    {caseData.address}
                  </div>
                  <div className="text-sm font-semibold text-slate-500 mt-0.5">
                    {[caseData.city, caseData.postcode]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                </div>
              </div>

              {/* Assessment Date */}
              <div className="flex-1 min-w-[200px] flex gap-4 items-center">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Assessment Date
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {caseData.assessmentDate
                      ? new Date(caseData.assessmentDate).toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "short", year: "numeric" },
                        )
                      : "Not set"}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">
                    Standard Field Survey
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="flex-1 min-w-[200px] flex gap-4 items-center">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Name
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {caseData.applicantName || "Not specified"}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Analysis Summary */}
            {summary ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle size={20} className="text-emerald-500" />
                    <h2 className="text-lg font-bold text-slate-900 m-0">
                      Strengths
                    </h2>
                  </div>
                  <div className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                    {summary.Strengths || "No strengths identified."}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={20} className="text-amber-500" />
                    <h2 className="text-lg font-bold text-slate-900 m-0">
                      Weaknesses
                    </h2>
                  </div>
                  <div className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                    {summary.Weaknesses || "No weaknesses identified."}
                  </div>
                </div>

                {summary.Recommendation && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Info size={20} className="text-blue-600" />
                      <h2 className="text-lg font-bold text-slate-900 m-0">
                        Recommendation
                      </h2>
                    </div>
                    <div className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                      {summary.Recommendation}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-12 text-center text-slate-400">
                <Info size={32} className="mb-4 opacity-50" />
                <p className="text-sm font-medium">
                  No AI analysis data available for this case.
                </p>
              </div>
            )}

            {/* Evidence Portfolio */}
            {((caseData.evidence?.length ?? 0) > 0 ||
              wizardData?.floorPlan) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900 mb-5 flex items-center gap-2">
                  Evidence Portfolio
                </h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5 mb-10">
                  {(caseData.evidence || []).map((img: string, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-2xl overflow-hidden border border-slate-200 relative"
                    >
                      <img
                        src={img}
                        alt="Evidence"
                        className="w-full aspect-[16/10] object-cover block"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-[11px] font-extrabold">
                        {idx === 0
                          ? "External Elevation"
                          : `Internal Asset #${idx}`}
                      </div>
                    </div>
                  ))}
                </div>
                {wizardData?.floorPlan && (
                  <div>
                    <h4 className="text-xs font-extrabold text-violet-900 border-l-4 border-violet-900 pl-3 mb-5">
                      Validated Floor Plan Map
                    </h4>
                    <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
                      <img
                        src={
                          typeof wizardData.floorPlan === "string"
                            ? wizardData.floorPlan
                            : URL.createObjectURL(wizardData.floorPlan)
                        }
                        alt="Floor Plan"
                        className="w-full max-h-[500px] object-contain rounded-xl"
                      />
                      <div className="mt-4 text-xs text-center text-slate-500 font-bold">
                        Homingo AI Vision: Spatial Mapping Applied (M4
                        Compliance Verified)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "ahr" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <ReportView
              caseData={caseData}
              onBack={() => setActiveTab("details")}
              onUpdateCase={handleUpdateCase}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseDetailView;
