import React from "react";
import { motion } from "framer-motion";
import { Bed, Bath, Toilet, MapPin, Users } from "lucide-react";
import { WizardStepProps } from "../types";
import { AIConfirmationCard } from "../AIConfirmationCard";
import {
  deriveBathroomLocation,
  normalizeBathroomLocation,
  normalizeBathingType,
  normalizeToiletType,
} from "@/lib/utils/normalizeAiOutputs";

const FacilitiesStep: React.FC<WizardStepProps> = ({
  formData,
  handleUpdateField,
  floorPlanAnalysis,
  aiSuggestions,
}) => {
  const aiBathroomDetected = normalizeBathroomLocation(
    aiSuggestions?.bathroom_location,
  );
  const floorPlanBathroomDerived = deriveBathroomLocation({
    accessFacilities: floorPlanAnalysis?.facilities_per_floor?.access_level,
    aboveFacilities: floorPlanAnalysis?.facilities_per_floor?.above,
    belowFacilities: floorPlanAnalysis?.facilities_per_floor?.below,
    floorLevelNumber: floorPlanAnalysis?.floor_level_number,
  });
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 flex flex-col gap-3"
    >
      <div className="mb-0">
        <h3 className="text-xl font-extrabold text-primary mb-0.5">
          Facilities & Rooms
        </h3>
        <p className="text-text-dim text-xs">
          Verify layout of kitchens and bathrooms.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {/* AI-First Bedroom Detection (Special Case with Number Input) */}
        <div className="bg-white rounded-[20px] p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-primary-light text-primary flex items-center justify-center">
                <Bed size={18} />
              </div>
              <div>
                <h4 className="text-[15px] font-extrabold text-slate-800 mb-0.5">
                  Accommodation
                </h4>
                <p className="text-xs text-slate-500">
                  Total bedrooms and occupancy limits.
                </p>
              </div>
            </div>
            {floorPlanAnalysis && (
              <div className="py-1 px-3 rounded-full bg-green-100 text-primary-dark text-[11px] font-extrabold">
                AI Detection Active
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bed size={16} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-600">
                  Bedrooms
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() =>
                    handleUpdateField(
                      "bedrooms",
                      Math.max(0, (formData.bedrooms || 0) - 1),
                    )
                  }
                  className="w-7 h-7 rounded-md border border-slate-300 bg-white cursor-pointer flex items-center justify-center text-lg font-bold text-slate-500 transition-all hover:bg-slate-100"
                >
                  -
                </button>
                <span className="text-base font-extrabold text-primary min-w-5 text-center">
                  {formData.bedrooms || 0}
                </span>
                <button
                  onClick={() =>
                    handleUpdateField("bedrooms", (formData.bedrooms || 0) + 1)
                  }
                  className="w-7 h-7 rounded-md border border-slate-300 bg-white cursor-pointer flex items-center justify-center text-lg font-bold text-slate-500 transition-all hover:bg-slate-100"
                >
                  +
                </button>
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users size={16} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-600">
                  Occupants
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() =>
                    handleUpdateField(
                      "bedSpaces",
                      Math.max(1, (formData.bedSpaces || 1) - 1),
                    )
                  }
                  className="w-7 h-7 rounded-md border border-slate-300 bg-white cursor-pointer flex items-center justify-center text-lg font-bold text-slate-500 transition-all hover:bg-slate-100"
                >
                  -
                </button>
                <span className="text-base font-extrabold text-primary min-w-5 text-center">
                  {formData.bedSpaces || 1}
                </span>
                <button
                  onClick={() =>
                    handleUpdateField(
                      "bedSpaces",
                      (formData.bedSpaces || 1) + 1,
                    )
                  }
                  className="w-7 h-7 rounded-md border border-slate-300 bg-white cursor-pointer flex items-center justify-center text-lg font-bold text-slate-500 transition-all hover:bg-slate-100"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <AIConfirmationCard
          label="Bathroom Location"
          description="Floor where the primary bathing facility is located."
          icon={<MapPin size={18} />}
          detectedValue={aiBathroomDetected || floorPlanBathroomDerived}
          userValue={formData.bathroomLocation}
          options={[
            "Ground Floor",
            "First Floor",
            "Split Level",
            "Second Floor+",
          ]}
          onConfirm={(val) => handleUpdateField("bathroomLocation", val)}
        />

        <AIConfirmationCard
          label="Bathing Facilities"
          description="Type of primary bathing equipment."
          icon={<Bath size={18} />}
          detectedValue={normalizeBathingType(aiSuggestions?.bathing_type) || null}
          userValue={formData.bathingType}
          options={[
            "Bath Only",
            "Over-Bath Shower",
            "Shower Cubicle",
            "Level Access Shower",
          ]}
          onConfirm={(val) => handleUpdateField("bathingType", val)}
        />

        <AIConfirmationCard
          label="Toilet Type"
          description="Configuration of the primary WC."
          icon={<Toilet size={18} />}
          detectedValue={normalizeToiletType(aiSuggestions?.toilet_type) || null}
          userValue={formData.toiletType}
          options={["Standard", "Raised Height", "Wash/Dry (Smart)"]}
          onConfirm={(val) => handleUpdateField("toiletType", val)}
        />
      </div>
    </motion.div>
  );
};

export default FacilitiesStep;
