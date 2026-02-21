import React from "react";
import { motion } from "framer-motion";
import { Ruler, HelpCircle } from "lucide-react";
import { WizardStepProps } from "../types";
import { CalibrationGuide } from "../CalibrationGuide";

const CalibrationStep: React.FC<WizardStepProps> = ({
  formData,
  handleUpdateField,
  handlePhotoUpload,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="p-4 text-center"
    >
      <div className="mb-4">
        <div className="w-8 h-8 rounded-[10px] bg-primary-light text-primary flex items-center justify-center mx-auto mb-2">
          <Ruler size={16} />
        </div>
        <h3 className="text-xl font-extrabold text-primary mb-0.5">
          AI Calibration
        </h3>
        <p className="text-text-dim text-xs max-w-[440px] mx-auto leading-snug">
          Reference object needed for <strong>millimetre-perfect</strong>{" "}
          calculations. Place an A4 paper or credit card.
        </p>
      </div>

      <div className="max-w-[540px] mx-auto bg-white p-6 rounded-3xl border border-border shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col items-center">
        <CalibrationGuide
          onPhotoCaptured={(file) => {
            if (handlePhotoUpload) {
              handlePhotoUpload({ target: { files: [file] } } as any);
            }
            handleUpdateField("calibrationWidth", "21.0");
          }}
          calibrationStatus={formData.calibrationWidth ? "VALID" : "PENDING"}
          feedbackMessage={
            formData.calibrationWidth
              ? "Calibration Success"
              : "Align reference to the guide."
          }
        />
      </div>

      <div className="mt-5 inline-flex items-center gap-2 py-2 px-4 bg-slate-50 rounded-xl border border-slate-200">
        <HelpCircle size={14} className="text-primary" />
        <span className="text-xs text-slate-600 font-bold">
          Reference: A4 Paper (210mm) or Credit Card (85.6mm)
        </span>
      </div>
    </motion.div>
  );
};

export default CalibrationStep;
