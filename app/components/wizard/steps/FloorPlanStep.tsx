import React from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { WizardStepProps } from "../types";
import { cn } from "@/lib/utils/cn";

const FloorPlanStep: React.FC<WizardStepProps> = ({
  formData,
  handleUpdateField,
  handlePhotoUpload,
  isAnalyzing,
  floorPlanAnalysis,
}) => {
  const hasPlan = !!formData.floorPlan;
  const planUrl = React.useMemo(() => {
    if (!formData.floorPlan) return null;
    if (typeof formData.floorPlan === "string") return formData.floorPlan;
    return URL.createObjectURL(formData.floorPlan);
  }, [formData.floorPlan]);

  const overlayState = hasPlan
    ? isAnalyzing
      ? "purple"
      : floorPlanAnalysis
        ? "green"
        : "yellow"
    : null;

  // Color mapping for annotation types
  const getTypeColor = (type: string) => {
    switch (type) {
      case "door":
        return {
          border: "#22c55e",
          bg: "rgba(34, 197, 94, 0.2)",
          text: "#15803d",
        };
      case "stairs":
        return {
          border: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.2)",
          text: "#b45309",
        };
      case "ramp":
        return {
          border: "#3b82f6",
          bg: "rgba(59, 130, 246, 0.2)",
          text: "#1d4ed8",
        };
      case "lift":
        return {
          border: "#a855f7",
          bg: "rgba(168, 85, 247, 0.2)",
          text: "#7e22ce",
        };
      case "second_exit":
        return {
          border: "#ef4444",
          bg: "rgba(239, 68, 68, 0.2)",
          text: "#b91c1c",
        };
      default:
        return {
          border: "#64748b",
          bg: "rgba(100, 116, 139, 0.2)",
          text: "#334155",
        };
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
            "flex flex-col items-center justify-center border-2 border-dashed rounded-[20px] cursor-pointer transition-all relative overflow-hidden min-h-[200px]",
            hasPlan ? "p-0 border-none" : "py-8 px-5",
            isAnalyzing && "border-primary bg-primary-light cursor-wait",
            hasPlan && !isAnalyzing && "bg-white",
            !hasPlan && !isAnalyzing && "bg-slate-50 border-slate-300",
          )}
        >
          <input
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
                      overlayState === "purple" && "bg-purple-500/40",
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
                  </div>
                )}
                {floorPlanAnalysis?.annotations?.map((ann, idx) => {
                  const [ymin, xmin, ymax, xmax] = ann.bbox;
                  const style = getTypeColor(ann.type);
                  return (
                    <div
                      key={idx}
                      className="absolute rounded pointer-events-none z-10"
                      style={{
                        top: `${(ymin / 1000) * 100}%`,
                        left: `${(xmin / 1000) * 100}%`,
                        height: `${((ymax - ymin) / 1000) * 100}%`,
                        width: `${((xmax - xmin) / 1000) * 100}%`,
                        border: `2px solid ${style.border}`,
                        backgroundColor: style.bg,
                      }}
                    >
                      {ann.label && (
                        <span
                          className="absolute -top-5 left-0 text-white text-[10px] font-bold py-0.5 px-1.5 rounded z-10 whitespace-nowrap"
                          style={{ background: style.border }}
                        >
                          {ann.label}
                        </span>
                      )}
                    </div>
                  );
                })}
                {!isAnalyzing && (
                  <div
                    className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold z-20"
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                  >
                    <div className="flex items-center gap-2 bg-black/60 py-2 px-4 rounded-full">
                      <Upload size={16} />
                      <span>Click to Replace</span>
                    </div>
                  </div>
                )}
              </div>

              {floorPlanAnalysis && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {floorPlanAnalysis.entrance_level && (
                    <div className="flex items-center gap-1.5 py-1.5 px-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="w-2 h-2 rounded-full bg-green-600" />
                      <span className="text-xs font-semibold text-green-800">
                        {floorPlanAnalysis.entrance_level.value} Level
                      </span>
                    </div>
                  )}
                  {floorPlanAnalysis.lift?.detected && (
                    <div className="flex items-center gap-1.5 py-1.5 px-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-xs font-semibold text-purple-900">
                        Lift Detected
                      </span>
                    </div>
                  )}
                  {floorPlanAnalysis.annotations?.some(
                    (a) => a.type === "stairs",
                  ) && (
                    <div className="flex items-center gap-1.5 py-1.5 px-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-semibold text-orange-800">
                        Stairs Found
                      </span>
                    </div>
                  )}
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
