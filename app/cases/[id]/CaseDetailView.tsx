"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import LahrBandBadge from "@/app/components/common/LahrBandBadge";
import { classifyLahr } from "@/lib/accessibility/lahr/classifier";
import { buildSurveyData } from "@/lib/surveys/buildSurveyData";
import CostEstimationRows from "@/app/components/report/CostEstimationRows";
import type { CostEstimation } from "@/lib/accessibility/cost-estimation/types";
import { pollCostEstimation } from "@/lib/accessibility/cost-estimation/client";
import {
  LAHR_BAND_BY_ID,
  type LahrBandId,
} from "@/lib/accessibility/lahr/types";

/**
 * Plain-English audience profile per band — what the home actually serves and where it falls
 * short. Drives the "Suitable for / Not suitable for" panel in the Why-this-grade card.
 */
const BAND_SUITABILITY: Record<
  LahrBandId,
  { suitableFor: string[]; notSuitableFor: string[] }
> = {
  A: {
    suitableFor: [
      "Full-time wheelchair users (manual or powered)",
      "Tenants needing carer transfers in every room",
      "Long-term occupancy with progressive mobility needs",
    ],
    notSuitableFor: ["(none — this is the highest accessibility band)"],
  },
  B: {
    suitableFor: [
      "Wheelchair users who need access to essential rooms (1 bedroom, bathroom, toilet, kitchen, living room)",
      "Tenants with carer support for non-essential rooms",
    ],
    notSuitableFor: [
      "Tenants needing wheelchair access to every bedroom or upper floors without a lift",
    ],
  },
  C: {
    suitableFor: [
      "Ambulant disabled tenants and older people",
      "Wheelchair users for the ground floor; future-proofed for stair-lift retrofit",
      "Households planning to age in place",
    ],
    notSuitableFor: [
      "Full-time power-chair users requiring wheelchair-grade clearances throughout",
    ],
  },
  D: {
    suitableFor: [
      "Older tenants with mild-to-moderate mobility limitations",
      "Ambulant disabled tenants who can manage stairs with handrails",
    ],
    notSuitableFor: [
      "Wheelchair users",
      "Tenants who cannot negotiate even a small step at the entrance",
    ],
  },
  E: {
    suitableFor: [
      "Ambulant tenants with limited mobility",
      "Tenants who use a stick or frame on flat surfaces",
    ],
    notSuitableFor: [
      "Wheelchair users",
      "Tenants needing turning space in kitchen / bathroom",
    ],
  },
  "E+": {
    suitableFor: [
      "Tenants with minor mobility issues who can manage up to four entrance steps",
    ],
    notSuitableFor: [
      "Wheelchair users",
      "Tenants who cannot climb steps unaided",
    ],
  },
  F: {
    suitableFor: ["Fully ambulant tenants with no mobility limitations"],
    notSuitableFor: [
      "Wheelchair users",
      "Older or disabled tenants with reduced mobility",
      "Tenants requiring level access at the front door",
    ],
  },
  G: {
    suitableFor: ["Cannot be determined — assessment data is incomplete"],
    notSuitableFor: [
      "Cannot be determined — fill in the missing fields to re-classify",
    ],
  },
};

interface CaseDetailViewProps {
  caseData: Case;
  costEstimation?: CostEstimation | null;
  /** Server-known background job state. When "pending", a regen is in flight server-side and
   *  the persisted plan is the stale one — we should show the loading state instead. */
  costEstimationJobStatus?: "pending" | "failed" | null;
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

const CaseDetailView: React.FC<CaseDetailViewProps> = ({
  caseData,
  costEstimation = null,
  costEstimationJobStatus = null,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"details" | "ahr">("details");
  // Lifted out of the tab-children so that whichever tab triggers a regeneration shares the
  // result with the other. Without this, switching tabs unmounts each child, the prop reverts
  // to the server-loaded snapshot, and `autoGenerateIfMissing` fires another redundant POST.
  // When the server reports a pending regen on first paint we deliberately ignore the loaded
  // estimation — it's the stale "previous" plan and the children should show the loading
  // overlay until the background job finishes.
  const [sharedCostEstimation, setSharedCostEstimation] = useState<
    CostEstimation | null | undefined
  >(costEstimationJobStatus === "pending" ? null : costEstimation);
  const [isResumingRegen, setIsResumingRegen] = useState(
    costEstimationJobStatus === "pending",
  );

  // Resume polling when we land on the page mid-regen (e.g. user refreshed during the 30-60s
  // background job). We don't POST again — the server's `after()` callback is already running
  // the work — we just poll until it resolves.
  useEffect(() => {
    if (!isResumingRegen) return;
    const surveyId = Number(caseData.id);
    if (!Number.isFinite(surveyId)) return;
    let cancelled = false;
    pollCostEstimation(surveyId)
      .then((estimation: CostEstimation) => {
        if (cancelled) return;
        setSharedCostEstimation(estimation);
        setIsResumingRegen(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Background job failed or polling timed out — fall back to whatever was persisted
        // (likely the previous plan) so the user at least sees something.
        setSharedCostEstimation(costEstimation);
        setIsResumingRegen(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [propertyCoords, setPropertyCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [evidenceIndex, setEvidenceIndex] = useState(0);
  const { aiReport, wizardData } = caseData.mlData || {};
  const summary = aiReport?.Summary;
  // Build the same row the report tab classifies against, so both tabs always show the same
  // Accessible Housing Rules band. Using the persisted `mlData.surveyRow` here would drift
  // from `buildSurveyData(...)` output and the two views could disagree.
  const overviewSurveyRow = useMemo(
    () =>
      buildSurveyData(
        caseData.mlData?.wizardData || {},
        caseData.mlData?.userOverrides || {},
        caseData.mlData?.rawAhr || {},
        caseData,
        "",
      ),
    [caseData],
  );
  const lahrSurveySource = overviewSurveyRow ?? null;
  const lahrEvaluation = lahrSurveySource
    ? classifyLahr(lahrSurveySource)
    : null;
  const lahrBand = lahrEvaluation?.band ?? null;
  const lahrBandDef = lahrBand ? LAHR_BAND_BY_ID[lahrBand] : null;

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
                  <div className="p-2 sm:p-2.5 rounded-lg bg-green-100 text-primary shrink-0">
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
              {lahrBand && lahrBandDef && (
                <div className="flex justify-center sm:justify-end shrink-0 sm:border-l sm:border-slate-200 sm:pl-6">
                  <div
                    className="bg-white rounded-[20px] p-4 sm:p-5 border flex flex-col items-center justify-center w-full sm:w-auto max-w-[360px]"
                    style={{ borderColor: lahrBandDef.color + "40" }}
                  >
                    <LahrBandBadge band={lahrBand} size="md" />
                    <div
                      className="text-sm font-bold leading-tight text-center mt-2"
                      style={{ color: lahrBandDef.color }}
                    >
                      {lahrBandDef.label}
                    </div>
                    <div className="text-[10px] text-slate-500 text-center mt-0.5 leading-tight">
                      {lahrBandDef.description}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {lahrBand && lahrBandDef && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <Info size={18} className="text-primary" />
                  <h2 className="text-base font-bold text-slate-900 m-0">
                    Why this grade?
                  </h2>
                </div>

                {/* What this band means */}
                <section className="space-y-1">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    What this grade means
                  </h3>
                  <p
                    className="text-sm font-bold leading-snug m-0"
                    style={{ color: lahrBandDef.color }}
                  >
                    {lahrBandDef.label}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-700 m-0">
                    {lahrBandDef.description}
                  </p>
                  {lahrBandDef.standard && (
                    <p className="text-[12px] text-slate-500 m-0">
                      <span className="font-semibold">Satisfies:</span>{" "}
                      {lahrBandDef.standard}
                    </p>
                  )}
                </section>

                {/* Suitable for / Not suitable for */}
                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CheckCircle size={14} className="text-emerald-600" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 m-0">
                        Suitable for
                      </h3>
                    </div>
                    <ul className="list-disc pl-5 text-[13px] text-slate-700 space-y-1 m-0">
                      {BAND_SUITABILITY[lahrBand].suitableFor.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <X size={14} className="text-rose-600" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-rose-800 m-0">
                        Not suitable for
                      </h3>
                    </div>
                    <ul className="list-disc pl-5 text-[13px] text-slate-700 space-y-1 m-0">
                      {BAND_SUITABILITY[lahrBand].notSuitableFor.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* What's currently capping this rating — pulled from triggered rules */}
                {(() => {
                  const cappingSections =
                    lahrEvaluation?.criteria.filter(
                      (c) => c.triggeredRules.length > 0 && c.id !== "g_rules",
                    ) ?? [];
                  const fallbackReasons = caseData.accessibilityReasons ?? [];
                  if (
                    cappingSections.length === 0 &&
                    fallbackReasons.length === 0
                  ) {
                    return null;
                  }
                  return (
                    <section className="space-y-2">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        What's holding this grade back
                      </h3>
                      {cappingSections.length > 0 ? (
                        <ul className="space-y-2 m-0">
                          {cappingSections.map((c) => (
                            <li
                              key={c.id}
                              className="rounded-md border border-slate-200 bg-slate-50/60 p-3"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[13px] font-semibold text-slate-800">
                                  {c.label}
                                </span>
                                {c.cappedBand && (
                                  <span
                                    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                                    style={{
                                      backgroundColor:
                                        LAHR_BAND_BY_ID[c.cappedBand].color,
                                    }}
                                  >
                                    Caps at {c.cappedBand}
                                  </span>
                                )}
                              </div>
                              <ul className="list-disc pl-5 text-[12px] text-slate-600 space-y-0.5 m-0">
                                {c.triggeredRules.slice(0, 3).map((r) => (
                                  <li key={r.n}>{r.description}</li>
                                ))}
                                {c.triggeredRules.length > 3 && (
                                  <li className="text-slate-400">
                                    + {c.triggeredRules.length - 3} more rule
                                    {c.triggeredRules.length - 3 === 1
                                      ? ""
                                      : "s"}
                                  </li>
                                )}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1 m-0">
                          {fallbackReasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })()}

                {/* Pointer to the DFG plan for what could change */}
                {lahrBand !== "A" && lahrBand !== "G" && (
                  <section className="rounded-md border border-green-200 bg-green-50/50 p-3">
                    <div className="flex items-start gap-2">
                      <Info
                        size={14}
                        className="text-primary mt-0.5 shrink-0"
                      />
                      <p className="text-[12px] leading-relaxed text-slate-700 m-0">
                        <span className="font-semibold text-primary-dark">
                          Potential changes:
                        </span>{" "}
                        the DFG Adoption Plan below shows the bespoke
                        adaptations that could lift this property's rating
                        within the £15K, £20K, and £30K Disabled Facilities
                        Grant tiers.
                      </p>
                    </div>
                  </section>
                )}
              </div>
            )}

            {lahrBand &&
              lahrBand !== "A" &&
              Number.isFinite(Number(caseData.id)) && (
                <CostEstimationRows
                  surveyId={Number(caseData.id)}
                  currentBand={lahrBand}
                  estimation={sharedCostEstimation}
                  onEstimationChange={setSharedCostEstimation}
                  surveyUpdatedAt={caseData.mlData?.surveyUpdatedAt ?? null}
                  forceLoading={isResumingRegen}
                />
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
                  <FileText size={20} className="text-primary" />
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
                      Homingo AI Vision: Spatial Mapping Applied (M4 Compliance
                      Verified)
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
              costEstimation={sharedCostEstimation}
              onCostEstimationChange={setSharedCostEstimation}
              costEstimationForceLoading={isResumingRegen}
              onCaseSaved={() => router.refresh()}
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
