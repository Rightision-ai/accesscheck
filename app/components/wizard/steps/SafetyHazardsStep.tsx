import React from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Undo2, Info } from "lucide-react";
import { WizardStepProps } from "../types";
import { AIConfirmationCard } from "../AIConfirmationCard";
import { cn } from "@/lib/utils/cn";
import { normalizeSecondExitLocation } from "@/lib/utils/normalizeAiOutputs";

const SafetyHazardsStep: React.FC<WizardStepProps> = ({
  formData,
  handleUpdateField,
  floorPlanAnalysis,
  aiSuggestions,
}) => {
  const aiSecondExitDetected =
    aiSuggestions?.second_exit_present === true
      ? "Yes"
      : aiSuggestions?.second_exit_present === false
        ? "No"
        : null;
  // Collect AI hazards
  const aiHazards: string[] = [];
  if (aiSuggestions?.suggested_hazards) {
    aiSuggestions.suggested_hazards
      .split(",")
      .forEach((h: string) => aiHazards.push(h.trim()));
  }
  if (aiSuggestions?.obstructions && aiSuggestions.obstructions !== "None") {
    aiHazards.push(`Obstruction: ${aiSuggestions.obstructions}`);
  }
  if (aiSuggestions?.door_clearance === "Restricted") {
    aiHazards.push("Restricted door clearance");
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 flex flex-col gap-5"
    >
      <div className="mb-1">
        <h3 className="text-[22px] font-extrabold text-primary mb-1">
          Safety & Hazards
        </h3>
        <p className="text-text-dim text-sm">
          Identify potential risks and compliance issues detected by AI.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Second Exit Confirmation */}
        <AIConfirmationCard
          label="Emergency Exit (Second Exit)"
          description="Presence of a secondary escape route (back door, etc.)"
          icon={<Undo2 size={22} />}
          detectedValue={aiSecondExitDetected}
          confidence={floorPlanAnalysis?.second_exit?.confidence}
          userValue={formData.secondExit}
          options={["Yes", "No"]}
          onConfirm={(val) => handleUpdateField("secondExit", val)}
        />

        {/* Exit Location (Conditional) */}
        {formData.secondExit === "Yes" && (
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
            <label className="block text-[11px] font-extrabold text-slate-500 mb-3 uppercase tracking-wider">
              Where does the second exit lead?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {["Public Way / Street", "Enclosed Garden"].map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleUpdateField("secondExitLocation", loc)}
                  className={cn(
                    "py-3 px-4 rounded-xl border font-bold text-xs cursor-pointer transition-all",
                    (formData.secondExitLocation ||
                      normalizeSecondExitLocation(
                        aiSuggestions?.second_exit_access_to_street,
                      )) === loc
                      ? "border-primary bg-primary-light text-primary"
                      : "border-slate-300 bg-white text-slate-500",
                  )}
                >
                  {loc}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2.5">
              <Info size={12} className="inline mr-1 align-middle" />A
              &quot;Safe Exit&quot; must lead directly to a public way.
            </p>
          </div>
        )}

        {/* Hazards Text Area */}
        <div className="bg-white rounded-3xl p-6 border border-border shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="text-red-500" />
            <h4 className="text-base font-extrabold text-slate-800">
              Known Hazards
            </h4>
          </div>
          <textarea
            placeholder="e.g. Loose carpet on stairs, trailing wires in hallway, dim lighting in bathroom..."
            value={formData.hazards || ""}
            onChange={(e) => handleUpdateField("hazards", e.target.value)}
            className="w-full min-h-[120px] p-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm outline-none resize-y leading-relaxed"
          />
          <div className="flex gap-2 flex-wrap">
            {["Trip Hazards", "Poor Lighting", "Damp/Mould"].map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  const current = formData.hazards || "";
                  if (!current.includes(tag))
                    handleUpdateField(
                      "hazards",
                      current ? `${current}, ${tag}` : tag,
                    );
                }}
                className="py-1 px-2.5 rounded-lg bg-slate-100 border-none text-[11px] font-bold text-slate-500 cursor-pointer"
              >
                + {tag}
              </button>
            ))}
            {aiHazards.map((tag, idx) => (
              <button
                key={`ai-${idx}`}
                onClick={() => {
                  const current = formData.hazards || "";
                  if (!current.includes(tag))
                    handleUpdateField(
                      "hazards",
                      current ? `${current}, ${tag}` : tag,
                    );
                }}
                className="py-1 px-2.5 rounded-lg bg-green-50 border border-green-200 text-[11px] font-bold text-primary-dark cursor-pointer flex items-center gap-1"
              >
                <ShieldAlert size={10} /> AI: {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SafetyHazardsStep;
