import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Key, ArrowUpCircle, Building2 } from "lucide-react";
import { WizardStepProps } from "../types";
import { AIConfirmationCard } from "../AIConfirmationCard";

const PropertyAccessStep: React.FC<WizardStepProps> = ({
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
      className="p-4 flex flex-col gap-4"
    >
      <div className="mb-0">
        <h3 className="text-xl font-extrabold text-primary mb-0.5">
          Property & Access
        </h3>
        <p className="text-text-dim text-xs">
          Verify the building type and accessibility features.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {/* Property Type */}
        <AIConfirmationCard
          label="Property Type"
          description="The architectural style of the dwelling."
          icon={<Home size={18} />}
          detectedValue={null}
          userValue={formData.propertyType}
          options={["House", "Bungalow", "Flat", "Maisonette"]}
          onConfirm={(val) => handleUpdateField("propertyType", val)}
        />

        {/* Tenure Type */}
        <AIConfirmationCard
          label="Tenure Type"
          description="Who manages or owns the property."
          icon={<Key size={18} />}
          detectedValue={null}
          userValue={formData.tenureType}
          options={[
            "Private",
            "Housing Association",
            "Council",
            "Shared Ownership",
          ]}
          onConfirm={(val) => handleUpdateField("tenureType", val)}
        />

        {/* Housing Association Name (Conditional) */}
        <AnimatePresence>
          {formData.tenureType === "Housing Association" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <label className="block text-[11px] font-bold mb-2 text-text-dim uppercase">
                Name of Housing Association
              </label>
              <input
                type="text"
                placeholder="e.g. Clarion Housing"
                value={formData.housingAssociationName || ""}
                onChange={(e) =>
                  handleUpdateField("housingAssociationName", e.target.value)
                }
                className="w-full py-3 px-4 rounded-xl border border-border bg-white text-sm outline-none"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Entrance Level */}
        <AIConfirmationCard
          label="Entrance Level"
          description="The main floor of the dwelling entrance."
          icon={<ArrowUpCircle size={18} />}
          detectedValue={
            aiSuggestions?.entrance_level ||
            (floorPlanAnalysis?.entrance_level?.value === "GROUND"
              ? "Ground Floor"
              : floorPlanAnalysis?.entrance_level?.value === "UPPER"
                ? "Upper Floor"
                : floorPlanAnalysis?.entrance_level?.value === "BASEMENT"
                  ? "Basement"
                  : null)
          }
          confidence={floorPlanAnalysis?.entrance_level?.confidence}
          userValue={formData.entranceLevel}
          options={["Ground Floor", "Upper Floor", "Basement"]}
          onConfirm={(val) => handleUpdateField("entranceLevel", val)}
        />

        {/* Communal Lifts (Conditional) */}
        {(formData.propertyType === "Flat" ||
          formData.propertyType === "Maisonette") && (
          <AIConfirmationCard
            label="Communal Lifts"
            description="Is there lift access to the property floor?"
            icon={<Building2 size={18} />}
            detectedValue={floorPlanAnalysis?.lift.detected ? "Yes" : "No"}
            confidence={floorPlanAnalysis?.lift.confidence}
            userValue={formData.communalLifts}
            options={["No", "Yes - Passenger", "Yes - Platform"]}
            onConfirm={(val) => handleUpdateField("communalLifts", val)}
          />
        )}
      </div>
    </motion.div>
  );
};

export default PropertyAccessStep;
