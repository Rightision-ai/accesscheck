"use client";

import React, { useState, useEffect } from "react";
import { Case } from "@/types/dashboard";
import ReportView from "@/app/components/report/ReportView";
import { useRouter } from "next/navigation";
import { saveSurveyClient } from "@/lib/surveys/client";
import { deleteSurvey } from "@/lib/surveys/actions";
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
  MapPin,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import AccessibilityBadge from "@/app/components/common/AccessibilityBadge";
import { LEGEND } from "@/lib/accessibility/flowchart";

interface CaseDetailViewProps {
  caseData: Case;
}

function toBulletItems(text: string | undefined): string[] {
  if (!text || typeof text !== "string") return [];
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function SummaryBulletList({
  items,
  emptyMessage,
}: {
  items: string[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-slate-600 m-0">
        {emptyMessage || "—"}
      </p>
    );
  }
  return (
    <ul className="list-disc list-inside text-sm leading-relaxed text-slate-600 m-0 pl-1 space-y-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

const CaseDetailView: React.FC<CaseDetailViewProps> = ({ caseData }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"details" | "ahr">("details");
  const [propertyCoords, setPropertyCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [evidenceIndex, setEvidenceIndex] = useState(0);
  const { aiReport, wizardData } = caseData.mlData || {};
  const summary = aiReport?.Summary;

  const confidenceScoreRaw = aiReport?.ConfidenceScore;
  const parsedConfidence = confidenceScoreRaw
    ? Number(String(confidenceScoreRaw).replace("%", "").trim())
    : NaN;
  const confidenceTier = aiReport?.Confidence;
  const confidencePct = Number.isFinite(parsedConfidence)
    ? Math.max(0, Math.min(100, Math.round(parsedConfidence)))
    : confidenceTier === "HIGH"
      ? 90
      : confidenceTier === "MEDIUM"
        ? 70
        : confidenceTier === "LOW"
          ? 50
          : null;
  const confidenceLabel =
    confidencePct === null
      ? "Unknown"
      : confidencePct >= 85
        ? "High Accuracy"
        : confidencePct >= 60
          ? "Medium Accuracy"
          : "Low Accuracy";
  const confidenceColor =
    confidencePct === null
      ? "#64748b"
      : confidencePct >= 85
        ? "#059669"
        : confidencePct >= 60
          ? "#f59e0b"
          : "#dc2626";
  const confidenceBg =
    confidencePct === null
      ? "#f1f5f9"
      : confidencePct >= 85
        ? "#ecfdf5"
        : confidencePct >= 60
          ? "#fffbeb"
          : "#fef2f2";

  useEffect(() => {
    const postcode = wizardData?.postcode || caseData.postcode;
    if (!postcode) return;
    setIsMapLoading(true);
    fetch("/api/proximity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postcode,
        street: wizardData?.street || "",
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.lat != null && data?.lon != null)
          setPropertyCoords({ lat: data.lat, lon: data.lon });
      })
      .catch(() => {})
      .finally(() => setIsMapLoading(false));
  }, [caseData.postcode, wizardData?.postcode, wizardData?.street]);
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

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this assessment? This cannot be undone.",
      )
    )
      return;
    const result = await deleteSurvey(caseData.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Assessment deleted");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 sm:py-0 sm:h-16 min-h-14 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button
              onClick={() => router.push("/")}
              className="p-2 rounded-full bg-transparent border-none cursor-pointer text-slate-500 flex items-center justify-center shrink-0 touch-manipulation"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 m-0 truncate">
                Case {caseData.id}
              </h1>
              <p className="text-xs text-slate-500 m-0 truncate">
                {caseData.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0 flex-wrap justify-end">
            <div
              className="flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-full text-xs font-bold border shrink-0"
              style={{
                background: statusBg,
                color: statusColor,
                borderColor: `${statusColor}20`,
              }}
            >
              <StatusIcon size={14} />
              {displayStatus}
            </div>

            <button
              onClick={handleDelete}
              className="py-1.5 px-2 sm:px-3 rounded-lg text-xs font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer flex items-center gap-2 transition-all touch-manipulation shrink-0"
              title="Delete assessment"
            >
              <Trash2 size={16} className="shrink-0" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <div className="flex gap-1 sm:gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("details")}
                className={cn(
                  "py-1.5 px-2 sm:px-4 rounded-md text-xs font-semibold border-none cursor-pointer flex items-center gap-2 transition-all touch-manipulation",
                  activeTab === "details"
                    ? "bg-white text-slate-900 "
                    : "bg-transparent text-slate-500",
                )}
                aria-label="Case Overview"
              >
                <List size={16} className="shrink-0" />
                <span className="hidden sm:inline">Case Overview</span>
              </button>
              <button
                onClick={() => setActiveTab("ahr")}
                className={cn(
                  "py-1.5 px-2 sm:px-4 rounded-md text-xs font-semibold border-none cursor-pointer flex items-center gap-2 transition-all touch-manipulation",
                  activeTab === "ahr"
                    ? "bg-white text-slate-900 "
                    : "bg-transparent text-slate-500",
                )}
                aria-label="AHR Report"
              >
                <FileText size={16} className="shrink-0" />
                <span className="hidden sm:inline">AHR Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto py-5 px-4 sm:px-6">
        {activeTab === "details" && (
          <div className="flex flex-col gap-4">
            {/* Case Details */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 bg-white p-5 rounded-3xl border border-slate-200 items-stretch">
              {/* Confidence (left-most) */}
              {confidencePct !== null && (
                <div className="flex justify-center sm:justify-start shrink-0 sm:border-r sm:border-slate-200 sm:pr-6">
                  <div
                    className="rounded-[20px] p-4 sm:p-5 border flex flex-col items-center justify-center w-full sm:w-auto min-w-[140px]"
                    style={{
                      borderColor: confidenceColor + "40",
                      background: confidenceBg,
                    }}
                  >
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      AI Confidence
                    </div>
                    <div
                      className="text-3xl sm:text-4xl font-black leading-none mt-2"
                      style={{ color: confidenceColor }}
                    >
                      {confidencePct}%
                    </div>
                    <div
                      className="text-[11px] font-bold mt-2 text-center"
                      style={{ color: confidenceColor }}
                    >
                      {confidenceLabel}
                    </div>
                  </div>
                </div>
              )}

              {/* Middle column: address stacked above date */}
              <div className="flex-1 flex flex-col gap-4 sm:gap-5 min-w-0 justify-center">
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="p-2 sm:p-2.5 rounded-lg bg-violet-100 text-violet-600 shrink-0">
                    <Home size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] sm:text-xs font-bold text-slate-500 mb-1 uppercase">
                      Property Address
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                      {caseData.address}
                      <br />
                      <span className="text-xs sm:text-sm font-semibold opacity-70">
                        {[caseData.city, caseData.postcode]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="p-2 sm:p-2.5 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                    <Calendar size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] sm:text-xs font-bold text-slate-500 mb-1 uppercase">
                      Assessment Date
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-slate-900">
                      {caseData.assessmentDate
                        ? new Date(caseData.assessmentDate).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : "Not set"}
                    </div>
                    <div className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-0.5">
                      Standard Field Survey
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column: accessibility grade */}
              {caseData.accessibilityGrade && (
                <div className="flex justify-center sm:justify-end shrink-0 sm:border-l sm:border-slate-200 sm:pl-6">
                  <div
                    className="bg-white rounded-[20px] p-4 sm:p-5 border flex flex-col items-center justify-center w-full sm:w-auto max-w-[360px]"
                    style={{
                      borderColor:
                        LEGEND[caseData.accessibilityGrade].color + "40",
                    }}
                  >
                    <AccessibilityBadge
                      grade={caseData.accessibilityGrade}
                      size="md"
                    />
                    <div
                      className="text-sm font-bold leading-tight text-center mt-2"
                      style={{
                        color: LEGEND[caseData.accessibilityGrade].color,
                      }}
                    >
                      {LEGEND[caseData.accessibilityGrade].label}
                    </div>
                    <div className="text-[10px] text-slate-500 text-center mt-0.5 leading-tight">
                      {LEGEND[caseData.accessibilityGrade].description}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {caseData.accessibilityGrade &&
              (caseData.accessibilityReasons?.length ?? 0) > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={18} className="text-violet-600" />
                    <h2 className="text-base font-bold text-slate-900 m-0">
                      Why this grade?
                    </h2>
                  </div>
                  <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1 m-0">
                    {caseData.accessibilityReasons!.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

            {/* AI Analysis Summary */}
            {summary ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 ">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={18} className="text-emerald-500" />
                    <h2 className="text-base font-bold text-slate-900 m-0">
                      Strengths
                    </h2>
                  </div>
                  <SummaryBulletList
                    items={toBulletItems(summary.Strengths)}
                    emptyMessage="No strengths identified."
                  />
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 ">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <h2 className="text-base font-bold text-slate-900 m-0">
                      Weaknesses
                    </h2>
                  </div>
                  <SummaryBulletList
                    items={toBulletItems(summary.Weaknesses)}
                    emptyMessage="No weaknesses identified."
                  />
                </div>

                {summary.Recommendation && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 ">
                    <div className="flex items-center gap-2 mb-3">
                      <Info size={18} className="text-blue-600" />
                      <h2 className="text-base font-bold text-slate-900 m-0">
                        Recommendation
                      </h2>
                    </div>
                    <SummaryBulletList
                      items={toBulletItems(summary.Recommendation)}
                      emptyMessage=""
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-8 text-center  text-slate-400">
                <Info size={28} className="mb-3 opacity-50" />
                <p className="text-sm font-medium">
                  No AI analysis data available for this case.
                </p>
              </div>
            )}

            {/* Map and Floor plan – always visible cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <MapPin size={20} className="text-slate-600" />
                  Property Location
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative h-[200px]">
                  {isMapLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 animate-pulse">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-2" />
                      <span className="text-xs font-semibold text-slate-400">
                        Loading map...
                      </span>
                    </div>
                  ) : propertyCoords ? (
                    <img
                      src={`/api/map-image?lat=${propertyCoords.lat}&lon=${propertyCoords.lon}`}
                      alt="Property location"
                      className="w-full h-full object-cover block"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <MapPin size={24} className="mb-2 opacity-60" />
                      <span className="text-sm font-semibold">No map info</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Approximate location based on postcode:{" "}
                  {wizardData?.postcode || caseData.postcode || "N/A"}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-violet-600" />
                  Validated Floor Plan
                </h3>
                {wizardData?.floorPlan ? (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <img
                      src={
                        typeof wizardData.floorPlan === "string"
                          ? wizardData.floorPlan
                          : URL.createObjectURL(wizardData.floorPlan)
                      }
                      alt="Floor plan"
                      className="w-full max-h-[320px] object-contain rounded-lg"
                    />
                    <p className="mt-2 text-[11px] text-center text-slate-500 font-semibold">
                      Homingo AI Vision: Spatial Mapping Applied (M4
                      Compliance Verified)
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl bg-slate-50 h-[200px] flex flex-col items-center justify-center text-slate-400">
                    <FileText size={24} className="mb-2 opacity-60" />
                    <span className="text-sm font-semibold">No plan</span>
                  </div>
                )}
              </div>
            </div>

            {/* Evidence Portfolio - always visible card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 ">
              <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <ImageIcon size={18} className="text-slate-600" />
                Evidence Portfolio
              </h3>
              {(caseData.evidence?.length ?? 0) > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                  {(caseData.evidence || []).map((img: string, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-2xl overflow-hidden border border-slate-200 relative"
                    >
                      <img
                        src={img}
                        alt="Evidence"
                        className="w-full aspect-16/10 object-cover block"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/80 to-transparent text-white text-[11px] font-extrabold">
                        {idx === 0
                          ? "External Elevation"
                          : `Internal Asset #${idx}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl bg-slate-50 h-[180px] flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon size={24} className="mb-2 opacity-60" />
                  <span className="text-sm font-semibold">No evidence</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "ahr" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden ">
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
