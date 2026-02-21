import React from "react";
import { motion } from "framer-motion";
import { Copy } from "lucide-react";
import { WizardStepProps } from "../types";
import { cn } from "@/lib/utils/cn";

const MultiplePropertiesStep: React.FC<WizardStepProps> = ({
  formData,
  handleUpdateField,
}) => {
  const isYes = formData.multipleProperties === "Yes";
  const isNo = formData.multipleProperties === "No";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-[10px] bg-primary-light flex items-center justify-center">
          <Copy size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="m-0 text-[17px] font-extrabold text-slate-800">
            Multiple Identical Properties
          </h2>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-[10px] p-4 mb-6 mt-4">
        <p className="m-0 text-xs text-slate-600 leading-relaxed">
          If this property is one of a number of{" "}
          <strong>identical units</strong> in the same block or development,
          this survey will apply to all identical units — saving time on repeat
          assessments.
        </p>
      </div>

      <p className="text-sm font-semibold text-slate-800 mb-4">
        Is this property one of multiple identical units in the same block or
        development?
      </p>

      <div className="flex gap-4 mb-6">
        <button
          className={cn(
            "flex-1 py-4 px-3 rounded-xl border-2 cursor-pointer font-bold text-[15px] transition-all text-center",
            isYes
              ? "border-primary bg-primary-light text-indigo-700"
              : "border-slate-200 bg-white text-slate-500",
          )}
          onClick={() => handleUpdateField("multipleProperties", "Yes")}
        >
          Yes
        </button>
        <button
          className={cn(
            "flex-1 py-4 px-3 rounded-xl border-2 cursor-pointer font-bold text-[15px] transition-all text-center",
            isNo
              ? "border-primary bg-primary-light text-indigo-700"
              : "border-slate-200 bg-white text-slate-500",
          )}
          onClick={() => {
            handleUpdateField("multipleProperties", "No");
            handleUpdateField("multiplePropertiesCount", "");
          }}
        >
          No
        </button>
      </div>

      {isYes && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="bg-primary-light border-[1.5px] border-indigo-200 rounded-[10px] p-4">
            <label className="text-xs font-semibold text-indigo-700 block mb-2.5">
              How many identical units are there in total?
            </label>
            <input
              type="number"
              min="2"
              placeholder="e.g. 12"
              value={formData.multiplePropertiesCount || ""}
              onChange={(e) =>
                handleUpdateField("multiplePropertiesCount", e.target.value)
              }
              className="w-[120px] py-2.5 px-3 border-[1.5px] border-indigo-300 rounded-lg text-[15px] font-bold text-slate-800 bg-white outline-none"
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MultiplePropertiesStep;
