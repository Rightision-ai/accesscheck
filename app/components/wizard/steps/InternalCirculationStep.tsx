import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownCircle } from "lucide-react";
import { WizardStepProps } from "../types";
import { AIConfirmationCard } from "../AIConfirmationCard";
import { normalizeInternalLiftOption } from "@/lib/utils/normalizeAiOutputs";

const InternalCirculationStep: React.FC<WizardStepProps> = ({
  formData,
  handleUpdateField,
  floorPlanAnalysis,
  aiSuggestions,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 flex flex-col gap-3"
    >
      <div className="mb-0">
        <h3 className="text-xl font-extrabold text-primary mb-0.5">
          Internal Circulation
        </h3>
        <p className="text-text-dim text-xs">
          Confirm internal doors, stairs and corridor widths.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {/* Main Stairs Detection */}
        <AIConfirmationCard
          label="Internal Stairs"
          description="Presence of a staircase connecting main floors."
          icon={<ArrowUpRight size={18} />}
          detectedValue={
            aiSuggestions?.has_stairs !== undefined
              ? aiSuggestions.has_stairs
                ? "Yes"
                : "No"
              : floorPlanAnalysis?.internal_stairs?.detected
                ? "Yes"
                : "No"
          }
          confidence={floorPlanAnalysis?.internal_stairs?.confidence}
          userValue={formData.internalStairs}
          options={["Yes", "No"]}
          onConfirm={(val) => handleUpdateField("internalStairs", val)}
        />

        <AnimatePresence>
          {formData.internalStairs === "Yes" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden flex flex-col gap-3"
            >
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Stair Geometry
                  </label>
                  <select
                    value={formData.internalStairsType || ""}
                    onChange={(e) =>
                      handleUpdateField("internalStairsType", e.target.value)
                    }
                    className="w-full py-2.5 px-2.5 rounded-[10px] border border-slate-300 bg-white text-sm outline-none"
                  >
                    <option value="">Select Type...</option>
                    <option value="Straight">Straight</option>
                    <option value="Quarter Turn">Quarter Turn</option>
                    <option value="Half Turn">Half Turn</option>
                    <option value="Spiral">Spiral</option>
                    <option value="Winding">Winding</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Handrails
                  </label>
                  <select
                    value={formData.internalHandrails || ""}
                    onChange={(e) =>
                      handleUpdateField("internalHandrails", e.target.value)
                    }
                    className="w-full py-2.5 px-2.5 rounded-[10px] border border-slate-300 bg-white text-sm outline-none"
                  >
                    <option value="">Select Side...</option>
                    <option value="None">None</option>
                    <option value="Left Side">Left Side</option>
                    <option value="Right Side">Right Side</option>
                    <option value="Both Sides">Both Sides</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Internal Lifts */}
        <AIConfirmationCard
          label="Internal Lift / Stairlift"
          description="Mechanical aids for level changes."
          icon={<ArrowDownCircle size={18} />}
          detectedValue={
            aiSuggestions?.internal_lift_option !== undefined ||
            aiSuggestions?.stair_lift_present !== undefined ||
            aiSuggestions?.through_floor_lift_present !== undefined
              ? normalizeInternalLiftOption({
                  stairLift: aiSuggestions?.stair_lift_present,
                  throughFloorLift: aiSuggestions?.through_floor_lift_present,
                  internalLiftRaw: aiSuggestions?.internal_lift_option,
                })
              : null
          }
          userValue={formData.internalLift}
          options={["None", "Stairlift", "Through-Floor Lift"]}
          onConfirm={(val) => handleUpdateField("internalLift", val)}
        />
      </div>
    </motion.div>
  );
};

export default InternalCirculationStep;
