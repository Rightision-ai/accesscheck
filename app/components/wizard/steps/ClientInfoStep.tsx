import React from "react";
import { motion } from "framer-motion";
import { WizardStepProps } from "../types";

const ClientInfoStep: React.FC<WizardStepProps> = ({
  formData,
  handleUpdateField,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 flex flex-col gap-4"
    >
      <div className="mb-1">
        <h3 className="text-[22px] font-extrabold text-primary mb-1">
          Client Information
        </h3>
        <p className="text-text-dim text-xs">
          Enter the primary details for the assessment case.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Row 1: Door No, Street No, Building Name */}
        <div className="grid grid-cols-[80px_80px_1fr] gap-4">
          <div className="input-group">
            <label className="flex items-center gap-2 text-xs font-bold text-text-dim mb-2 uppercase tracking-wider">
              Door No
            </label>
            <input
              type="text"
              placeholder="00"
              value={formData.doorNo || ""}
              onChange={(e) => handleUpdateField("doorNo", e.target.value)}
              className="w-full py-3.5 px-4 rounded-xl border border-border bg-white text-[15px] outline-none transition-all shadow-sm"
              autoComplete="address-line1"
            />
          </div>
          <div className="input-group">
            <label className="flex items-center gap-2 text-xs font-bold text-text-dim mb-2 uppercase tracking-wider">
              Street No
            </label>
            <input
              type="text"
              placeholder="00"
              value={formData.streetNo || ""}
              onChange={(e) => handleUpdateField("streetNo", e.target.value)}
              className="w-full py-3.5 px-4 rounded-xl border border-border bg-white text-[15px] outline-none transition-all shadow-sm"
              autoComplete="off"
            />
          </div>
          <div className="input-group">
            <label className="flex items-center gap-2 text-xs font-bold text-text-dim mb-2 uppercase tracking-wider">
              Building Name
            </label>
            <input
              type="text"
              placeholder="e.g. Skyline Towers"
              value={formData.buildingName || ""}
              onChange={(e) =>
                handleUpdateField("buildingName", e.target.value)
              }
              className="w-full py-3.5 px-4 rounded-xl border border-border bg-white text-[15px] outline-none transition-all shadow-sm"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Row 2: Street */}
        <div className="input-group">
          <label className="flex items-center gap-2 text-xs font-bold text-text-dim mb-2 uppercase tracking-wider">
            Street{" "}
            <span className="text-red-500" title="Required">
              *
            </span>
          </label>
          <input
            type="text"
            placeholder="Street Name"
            value={formData.street || ""}
            onChange={(e) => handleUpdateField("street", e.target.value)}
            className="w-full py-3.5 px-4 rounded-xl border border-border bg-white text-[15px] outline-none transition-all shadow-sm"
            autoComplete="address-line2"
          />
        </div>

        {/* Row 3: Postcode, Your Full Name */}
        <div className="grid grid-cols-[120px_1fr] gap-4">
          <div className="input-group">
            <label className="flex items-center gap-2 text-xs font-bold text-text-dim mb-2 uppercase tracking-wider">
              Postcode{" "}
              <span className="text-red-500" title="Required">
                *
              </span>
            </label>
            <input
              type="text"
              placeholder="Postcode"
              value={formData.postcode || ""}
              onChange={(e) => handleUpdateField("postcode", e.target.value)}
              className="w-full py-3.5 px-4 rounded-xl border border-border bg-white text-[15px] outline-none transition-all shadow-sm"
              autoComplete="postal-code"
            />
          </div>
          <div className="input-group">
            <label className="flex items-center gap-2 text-xs font-bold text-text-dim mb-2 uppercase tracking-wider">
              Your Full Name{" "}
              <span className="text-red-500" title="Required">
                *
              </span>
            </label>
            <input
              type="text"
              placeholder="e.g. John Smith"
              value={formData.fullName || ""}
              onChange={(e) => handleUpdateField("fullName", e.target.value)}
              className="w-full py-3.5 px-4 rounded-xl border border-border bg-white text-[15px] outline-none transition-all shadow-sm"
              autoComplete="name"
            />
          </div>
        </div>

        {/* Row 4: Your Phone Number, Date of Inspection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="input-group">
            <label className="flex items-center gap-2 text-xs font-bold text-text-dim mb-2 uppercase tracking-wider">
              Your Phone Number
            </label>
            <input
              type="tel"
              placeholder="e.g. 07700 900000"
              value={formData.phoneNumber || ""}
              onChange={(e) => handleUpdateField("phoneNumber", e.target.value)}
              className="w-full py-3.5 px-4 rounded-xl border border-border bg-white text-[15px] outline-none transition-all shadow-sm"
              autoComplete="tel"
            />
          </div>
          <div className="input-group">
            <label className="flex items-center gap-2 text-xs font-bold text-text-dim mb-2 uppercase tracking-wider">
              Date of Inspection
            </label>
            <input
              type="date"
              value={formData.assessmentDate || ""}
              readOnly
              className="w-full py-3.5 px-4 rounded-xl border border-border bg-slate-100 cursor-not-allowed text-slate-500 text-[15px] outline-none transition-all shadow-sm"
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ClientInfoStep;
