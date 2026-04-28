import React from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, CheckCircle, AlertCircle, Trash2, RefreshCw } from "lucide-react";
import { WizardStepProps } from "../types";
import { cn } from "@/lib/utils/cn";

const FloorPlanStep: React.FC<WizardStepProps> = ({
  formData,
  handleUpdateField,
  handlePhotoUpload,
  isAnalyzing,
  floorPlanAnalysis,
  onClearFloorPlan,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const hasPlan = !!formData.floorPlan;
  const planUrl = React.useMemo(() => {
    if (!formData.floorPlan) return null;
    if (typeof formData.floorPlan === "string") return formData.floorPlan;
    return URL.createObjectURL(formData.floorPlan);
  }, [formData.floorPlan]);

  const isPlanApproved = floorPlanAnalysis && floorPlanAnalysis.is_floor_plan !== false;
  const overlayState = hasPlan
    ? isAnalyzing
      ? "purple"
      : isPlanApproved
        ? "green"
        : "yellow"
    : null;

  const handleRemove = () => {
    onClearFloorPlan?.();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReplace = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="p-4 text-center"
    >
      <div className="mb-4">
        <h3 className="text-xl font-extrabold text-primary mb-0.5">
          Floor Plan Analysis
        </h3>
        <p className="text-text-dim text-xs">
          Upload a drawing to automate 80% of the accessibility assessment.
        </p>
      </div>

      <div className="max-w-[600px] mx-auto">
        <label
          htmlFor="floorPlanUpload"
          className={cn(
            "flex flex-col items-center justify-center border-2 border-dashed rounded-[20px] transition-all relative overflow-hidden min-h-[200px]",
            hasPlan ? "p-0 border-none cursor-default" : "py-8 px-5 cursor-pointer",
            isAnalyzing && "border-primary bg-primary-light cursor-wait",
            hasPlan && !isAnalyzing && "bg-white",
            !hasPlan && !isAnalyzing && "bg-slate-50 border-slate-300",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="floorPlanUpload"
            accept="image/*,image/heic,.heic,.pdf"
            hidden
            onChange={handlePhotoUpload}
            disabled={isAnalyzing}
          />

          {hasPlan && planUrl ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full relative"
            >
              <div className="relative w-full h-[200px] rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50">
                <img
                  src={planUrl}
                  alt="Floor Plan"
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
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
              {!isAnalyzing && (
                <div className="flex items-center justify-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReplace(); }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw size={16} />
                    Replace file
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(); }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
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
            </motion.div>
          )}
        </label>

        <div
          onClick={() =>
            handleUpdateField("hasNoFloorPlan", !formData.hasNoFloorPlan)
          }
          className={cn(
            "mt-3 py-2.5 px-3.5 rounded-xl cursor-pointer flex items-center gap-2.5 transition-all border",
            formData.hasNoFloorPlan
              ? "bg-primary-light border-primary"
              : "bg-white border-slate-200",
          )}
        >
          <div
            className={cn(
              "w-[18px] h-[18px] rounded border-2 flex items-center justify-center text-white shrink-0",
              formData.hasNoFloorPlan
                ? "border-primary bg-primary"
                : "border-slate-300 bg-transparent",
            )}
          >
            {formData.hasNoFloorPlan && <CheckCircle size={12} />}
          </div>
          <span
            className={cn(
              "text-xs font-bold",
              formData.hasNoFloorPlan ? "text-primary" : "text-slate-600",
            )}
          >
            I don&apos;t have a floor plan (Estimate from photos)
          </span>
        </div>
      </div>

      <div className="mt-6 p-4 bg-slate-50 rounded-2xl flex items-start gap-3 text-left">
        <AlertCircle size={18} className="text-primary mt-0.5 shrink-0" />
        <div>
          <span className="block font-extrabold text-xs text-slate-800 mb-0.5">
            Pro Tip
          </span>
          <p className="text-xs text-slate-500 leading-snug">
            A clear, top-down drawing helps our engine detect door widths, stair
            counts, and dimensions with millimeter precision.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default FloorPlanStep;
