import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2, FileText, ClipboardCheck } from "lucide-react";
import { WizardStepProps } from "../types";

const AnalysisStep: React.FC<WizardStepProps> = ({
  formData,
  isAnalyzing,
  onNext,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="p-6 text-center"
    >
      <div className="max-w-[500px] mx-auto">
        {isAnalyzing ? (
          <div className="flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center relative">
              <Loader2 size={40} className="text-primary animate-spin" />
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-primary"
              />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-primary mb-2">
                Analyzing Compliance
              </h3>
              <p className="text-text-dim text-sm">
                The Homingo ASE engine is processing 43 data points against
                enterprise accessibility standards.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.2)]">
              <ShieldCheck size={48} />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-slate-800 mb-2">
                Assessment Ready
              </h3>
              <p className="text-text-dim text-[15px]">
                Analysis complete. A detailed grade and compliance report
                generated for {formData.fullName}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="p-5 bg-white rounded-[20px] border border-border flex items-center gap-4 text-left">
                <ClipboardCheck size={18} className="text-primary" />
                <div>
                  <span className="block text-xs font-bold text-slate-500 mb-0.5">
                    Compliance
                  </span>
                  <span className="text-xl font-extrabold text-slate-800">
                    {formData.aiReport?.AccessibilityScore || "Pending…"}
                  </span>
                </div>
              </div>
              <div className="p-5 bg-white rounded-[20px] border border-border flex items-center gap-4 text-left">
                <FileText size={18} className="text-green-600" />
                <div>
                  <span className="block text-xs font-bold text-slate-500 mb-0.5">
                    Grade
                  </span>
                  <span className="text-xl font-extrabold text-slate-800">
                    {formData.aiReport?.Grade || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-[20px] border border-slate-200 w-full text-left">
              <h4 className="text-xs font-extrabold text-slate-800 mb-3 uppercase">
                Next Steps
              </h4>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Review AI inferred observations
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Download PDF Survey Report
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Export data to Case Management
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AnalysisStep;
