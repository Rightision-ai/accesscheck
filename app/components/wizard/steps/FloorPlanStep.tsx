import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Search,
  Sparkles,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { WizardStepProps } from "../types";
import { cn } from "@/lib/utils/cn";
import PlanningDocList, { PlanningSource } from "./PlanningDocList";

type YesNo = "yes" | "no" | null;

const FloorPlanStep: React.FC<WizardStepProps> = ({
  formData,
  handleUpdateField,
  handlePhotoUpload,
  isAnalyzing,
  floorPlanAnalysis,
  onClearFloorPlan,
  onSelectPlanningDoc,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const hasPlan = !!formData.floorPlan;
  const isPdf = !!formData.floorPlanIsPdf;
  const fromAiSearch = formData.floorPlanSource === "ai-search";

  // Hydrate the branch questions from existing form state (Back-navigation).
  const [q1, setQ1] = React.useState<YesNo>(
    fromAiSearch
      ? "no"
      : hasPlan
        ? "yes"
        : formData.hasNoFloorPlan
          ? "no"
          : null,
  );
  const [q2, setQ2] = React.useState<YesNo>(
    fromAiSearch ? "yes" : formData.hasNoFloorPlan && !hasPlan ? "no" : null,
  );

  const [searchingPlans, setSearchingPlans] = React.useState(false);
  const [searchedPlans, setSearchedPlans] = React.useState(false);
  const [planSources, setPlanSources] = React.useState<PlanningSource[]>([]);
  const [selectingId, setSelectingId] = React.useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(
    null,
  );

  const planUrl = React.useMemo(() => {
    if (!formData.floorPlan) return null;
    if (typeof formData.floorPlan === "string") return formData.floorPlan;
    return URL.createObjectURL(formData.floorPlan);
  }, [formData.floorPlan]);

  // We can render an <img> preview for images and for PDFs whose first page was
  // rendered in-wizard (a data:image). A stored PDF URL (reopened draft) can't preview.
  const canPreview =
    typeof planUrl === "string" &&
    (planUrl.startsWith("data:image") || !isPdf);

  const isPlanApproved =
    floorPlanAnalysis && floorPlanAnalysis.is_floor_plan !== false;
  const overlayState = hasPlan
    ? isAnalyzing
      ? "purple"
      : isPlanApproved
        ? "green"
        : "yellow"
    : null;

  const handleRemove = () => {
    onClearFloorPlan?.();
    setSelectedSourceId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReplace = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // ── Branch selectors ──────────────────────────────────────────────────
  const selectQ1 = (value: YesNo) => {
    setQ1(value);
    setQ2(null);
    if (value === "yes") {
      handleUpdateField("hasNoFloorPlan", false);
    } else if (value === "no") {
      if (formData.floorPlan) onClearFloorPlan?.();
      handleUpdateField("hasNoFloorPlan", false); // not decided until Q2
    }
  };

  const selectQ2 = (value: YesNo) => {
    setQ2(value);
    handleUpdateField("hasNoFloorPlan", value === "no");
  };

  async function runFloorplanSearch() {
    if (!formData.propertyId) return; // button stays disabled until the id arrives
    setSearchingPlans(true);
    try {
      await fetch(
        `/api/evidence-harvester/properties/${formData.propertyId}/floorplans`,
        { method: "POST" },
      );
      // The POST persists rows but returns no ids — re-read /evidence to get the
      // planning_portal sources (with ids) the PDF proxy needs.
      const evRes = await fetch(
        `/api/evidence-harvester/properties/${formData.propertyId}/evidence`,
        { cache: "no-store" },
      );
      const ev = evRes.ok ? await evRes.json() : null;
      const planning = (ev?.evidence_sources ?? []).filter(
        (s: any) => s.source_type === "planning_portal",
      );
      setPlanSources(planning);
      setSearchedPlans(true);
    } catch {
      toast.error("Floor-plan search failed. Please try again.");
    } finally {
      setSearchingPlans(false);
    }
  }

  const handleSelectDoc = async (sourceId: string) => {
    if (!onSelectPlanningDoc) return;
    setSelectingId(sourceId);
    try {
      await onSelectPlanningDoc(sourceId);
      setSelectedSourceId(sourceId);
    } finally {
      setSelectingId(null);
    }
  };

  const YesNoButtons = ({
    value,
    onChange,
  }: {
    value: YesNo;
    onChange: (v: YesNo) => void;
  }) => (
    <div className="flex gap-4">
      {(["yes", "no"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "flex-1 py-4 px-3 rounded-xl border-2 cursor-pointer font-bold text-[15px] transition-all text-center capitalize",
            value === opt
              ? "border-primary bg-primary-light text-primary-dark"
              : "border-slate-200 bg-white text-slate-500",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  // Compact status badge shown next to a selected file / PDF.
  const StatusBadge = () =>
    !hasPlan ? null : isAnalyzing ? (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
        <Loader2 size={14} className="animate-spin" /> Scanning…
      </span>
    ) : isPlanApproved ? (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600">
        <CheckCircle size={14} /> Plan approved
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600">
        <AlertCircle size={14} /> Review
      </span>
    );

  // A selected PDF is shown as a file row (no image preview).
  const SelectedFileCard = () => (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
        <FileText size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-slate-800 truncate">
          {formData.floorPlanName || "Selected floor plan.pdf"}
        </div>
        <div className="mt-0.5">
          <StatusBadge />
        </div>
      </div>
      {!isAnalyzing && (
        <div className="flex items-center gap-2 shrink-0">
          {formData.floorPlanOpenUrl && (
            <a
              href={formData.floorPlanOpenUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Open
            </a>
          )}
          {q1 === "yes" && (
            <button
              type="button"
              onClick={handleReplace}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              <RefreshCw size={14} /> Replace
            </button>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-white text-red-600 text-xs font-semibold hover:bg-red-50"
          >
            <Trash2 size={14} /> Remove
          </button>
        </div>
      )}
    </div>
  );

  // An uploaded image — or the rendered first page of a PDF — shown as a preview.
  const ImagePreview = ({
    showActions,
    allowReplace = true,
  }: {
    showActions: boolean;
    allowReplace?: boolean;
  }) => (
    <div>
      <div className="relative w-full h-[200px] rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50">
        {planUrl && (
          <img
            src={planUrl}
            alt="Floor Plan"
            className="max-w-full max-h-full w-auto h-auto object-contain"
          />
        )}
        {isPdf && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
            <FileText size={11} /> PDF
          </span>
        )}
        {overlayState && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-colors",
              overlayState === "purple" && "bg-primary/40",
              overlayState === "green" && "bg-green-500/40",
              overlayState === "yellow" && "bg-amber-400/40",
            )}
          >
            {overlayState === "purple" && (
              <div className="flex flex-col items-center gap-2 text-white">
                <Loader2 className="animate-spin" size={32} />
                <span className="font-bold text-sm">
                  AI is scanning floor plan...
                </span>
              </div>
            )}
            {overlayState === "green" && (
              <div className="flex flex-col items-center gap-2 text-white">
                <CheckCircle size={32} />
                <span className="font-bold text-sm">Plan Approved</span>
              </div>
            )}
          </div>
        )}
      </div>
      {showActions && !isAnalyzing && (
        <div className="flex items-center gap-2 mt-3">
          {isPdf && formData.floorPlanOpenUrl && (
            <a
              href={formData.floorPlanOpenUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Open PDF
            </a>
          )}
          {allowReplace && (
            <button
              type="button"
              onClick={handleReplace}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={16} />
              Replace file
            </button>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} />
            Remove
          </button>
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="p-6 flex flex-col gap-5"
    >
      <div>
        <h3 className="text-xl font-extrabold text-primary mb-0.5">
          Floor Plan Analysis
        </h3>
        <p className="text-text-dim text-xs">
          A floor plan automates up to 80% of the accessibility assessment.
        </p>
      </div>

      {/* Q1 — do you have a plan to upload? */}
      <div>
        <p className="text-sm font-semibold text-slate-800 ">
          Do you have a floor plan to upload?
        </p>

        <p className="text-xs mb-4 text-slate-500 leading-snug">
          A clear, top-down drawing helps our engine detect door widths, stair
          counts, and dimensions with millimeter precision.
        </p>
        <YesNoButtons value={q1} onChange={selectQ1} />
      </div>
      {/* Q1 = Yes → upload */}
      {q1 === "yes" && (
        <div>
          {/* Hidden input is always mounted so Replace works for both states */}
          <input
            ref={fileInputRef}
            type="file"
            id="floorPlanUpload"
            accept="image/*,image/heic,.heic,.pdf"
            hidden
            onChange={handlePhotoUpload}
            disabled={isAnalyzing}
          />
          {hasPlan ? (
            canPreview ? (
              <ImagePreview showActions />
            ) : (
              <SelectedFileCard />
            )
          ) : (
            <label
              htmlFor="floorPlanUpload"
              className={cn(
                "flex flex-col items-center justify-center border-2 border-dashed rounded-[20px] transition-all min-h-[180px] py-8 px-5",
                isAnalyzing
                  ? "border-primary bg-primary-light cursor-wait"
                  : "bg-slate-50 border-slate-300 cursor-pointer",
              )}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-slate-500 shadow-md">
                  <Upload size={24} />
                </div>
                <div className="text-center">
                  <span className="block font-extrabold text-slate-800 text-[15px]">
                    Click to Upload Plan
                  </span>
                  <span className="text-xs text-slate-500">
                    PNG, JPG or PDF (Max 10MB)
                  </span>
                </div>
              </div>
            </label>
          )}
        </div>
      )}

      {/* Q1 = No → Q2: search with AI? */}
      {q1 === "no" && (
        <>
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Want us to search for a floor plan with our AI assistant?
            </p>
            <YesNoButtons value={q2} onChange={selectQ2} />
          </div>

          {/* Q2 = Yes → planning search */}
          {q2 === "yes" && (
            <AnimatePresence mode="wait">
              <motion.div
                key="ai-search"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col gap-4"
              >
                {hasPlan && fromAiSearch ? (
                  /* A plan is selected → show only it; Remove brings the table back. */
                  canPreview ? (
                    <ImagePreview showActions allowReplace={false} />
                  ) : (
                    <SelectedFileCard />
                  )
                ) : (
                  <>
                    {!formData.propertyId && (
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        <Loader2 size={14} className="animate-spin shrink-0" />
                        Preparing property details — the floor-plan search will be
                        available once the property is matched.
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={runFloorplanSearch}
                      disabled={
                        searchingPlans || isAnalyzing || !formData.propertyId
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed self-start"
                    >
                      {searchingPlans ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Search size={16} />
                      )}
                      {searchingPlans
                        ? "Searching…"
                        : searchedPlans
                          ? "Search again"
                          : "Find floor plans"}
                    </button>

                    {searchedPlans && planSources.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                        No planning documents were found for this address in
                        council planning records.
                        <button
                          type="button"
                          onClick={() => selectQ2("no")}
                          className="block mt-2 font-bold text-primary"
                        >
                          Continue without a floor plan →
                        </button>
                      </div>
                    ) : planSources.length > 0 ? (
                      <PlanningDocList
                        sources={planSources}
                        selectedSourceId={selectedSourceId}
                        selectingId={selectingId}
                        onSelect={handleSelectDoc}
                      />
                    ) : null}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Q2 = No → proceed without a plan */}
          {q2 === "no" && (
            <div className="rounded-xl border border-primary bg-primary-light px-4 py-3 text-sm font-semibold text-primary flex items-center gap-2">
              <CheckCircle size={16} />
              No floor plan — we&apos;ll estimate from your photos in the next
              steps.
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default FloorPlanStep;
