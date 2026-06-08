import React from "react";
import { motion } from "framer-motion";
import { Search, Loader2, MapPin } from "lucide-react";
import { WizardStepProps } from "../types";
import {
  normalizePropertyType,
  normalizeEntranceLevelFromDwelling,
  parseAddressString,
} from "@/lib/utils/normalizeAiOutputs";
import type { EpcMatch } from "@/lib/evidence-harvester/types";

type AddressOption = {
  address: string;
  uprn: string | null;
  certificateNumber: string | null;
  postcode: string | null;
};

const ClientInfoStep: React.FC<WizardStepProps> = ({
  formData,
  handleUpdateField,
}) => {
  const [postcode, setPostcode] = React.useState<string>(
    formData.postcode || "",
  );
  const [searching, setSearching] = React.useState(false);
  const [searched, setSearched] = React.useState(false);
  const [addresses, setAddresses] = React.useState<AddressOption[]>([]);
  const [postcodeValid, setPostcodeValid] = React.useState<boolean | null>(
    null,
  );
  const [manual, setManual] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // The address fields are revealed once an address is selected (evidenceLoaded
  // persists in formData so it survives Back-navigation) or on manual opt-in.
  const showDetails = !!formData.evidenceLoaded || manual;

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSearched(false);
    setManual(false);
    if (!postcode.trim()) {
      setError("Please enter a postcode.");
      return;
    }
    handleUpdateField("postcode", postcode.trim());
    setSearching(true);
    try {
      const res = await fetch(
        `/api/evidence-harvester/addresses?postcode=${encodeURIComponent(postcode)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      setPostcodeValid(data.valid);
      setAddresses(data.addresses ?? []);
      setSearched(true);
      // No registered addresses (or EPC unavailable) → offer manual entry.
      if (data.valid && (data.addresses ?? []).length === 0) setManual(true);
    } catch {
      setError("Could not search this postcode. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  /** Fill the extra EPC-derived fields when background enrichment resolves. */
  function applyEvidenceToForm(ev: any) {
    if (ev?.property?.postcode) handleUpdateField("postcode", ev.property.postcode);
    handleUpdateField("streetViewUrl", ev?.street_view_image_url ?? null);
    handleUpdateField("propertyLat", ev?.property?.latitude ?? null);
    handleUpdateField("propertyLng", ev?.property?.longitude ?? null);

    const epcRow = (ev?.evidence_sources ?? []).find(
      (s: any) => s.source_type === "epc",
    );
    const epc = epcRow?.raw_metadata_json as EpcMatch | undefined;
    const propertyType = normalizePropertyType(
      epc?.property_type ?? ev?.property?.property_type,
    );
    if (propertyType && !formData.propertyType)
      handleUpdateField("propertyType", propertyType);
    const entranceLevel = normalizeEntranceLevelFromDwelling(
      epc?.details?.dwelling_type,
    );
    if (entranceLevel && !formData.entranceLevel)
      handleUpdateField("entranceLevel", entranceLevel);
  }

  /** Enrich the property in the background — never blocks revealing the fields. */
  async function enrich(address: string, uprn: string | null) {
    try {
      const res = await fetch("/api/evidence-harvester/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          postcode: postcode.trim() || formData.postcode,
          uprn: uprn || undefined,
        }),
      });
      if (!res.ok) return;
      const { propertyId } = await res.json();
      handleUpdateField("propertyId", propertyId);

      const evRes = await fetch(
        `/api/evidence-harvester/properties/${propertyId}/evidence`,
        { cache: "no-store" },
      );
      if (evRes.ok) applyEvidenceToForm(await evRes.json());
    } catch {
      /* silent — manual fields are already available */
    }
  }

  function selectAddress(address: string, uprn: string | null) {
    // Reveal + optimistically fill from the selected address immediately.
    const parsed = parseAddressString(address);
    if (parsed.doorNo) handleUpdateField("doorNo", parsed.doorNo);
    if (parsed.buildingName) handleUpdateField("buildingName", parsed.buildingName);
    handleUpdateField("street", parsed.street ?? address);
    handleUpdateField("postcode", postcode.trim() || formData.postcode);
    handleUpdateField("evidenceLoaded", true);
    // Fetch public records in the background.
    void enrich(address, uprn);
  }

  const inputCls =
    "w-full py-3.5 px-4 rounded-xl border border-border bg-white text-[15px] outline-none transition-all shadow-sm";
  const labelCls =
    "flex items-center gap-2 text-xs font-bold text-text-dim mb-2 uppercase tracking-wider";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 flex flex-col gap-5"
    >
      <div className="mb-1">
        <h3 className="text-[22px] font-extrabold text-primary mb-1">
          Client Information
        </h3>
        <p className="text-text-dim text-xs">
          Search the property by postcode, then pick the address.
        </p>
      </div>

      {/* Full Name + Phone (one row) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="input-group">
          <label className={labelCls}>
            Your Full Name{" "}
            <span className="text-red-500" title="Required">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. John Smith"
            value={formData.fullName || ""}
            onChange={(e) => handleUpdateField("fullName", e.target.value)}
            className={inputCls}
            autoComplete="name"
          />
        </div>
        <div className="input-group">
          <label className={labelCls}>Your Phone Number</label>
          <input
            type="tel"
            placeholder="e.g. 07700 900000"
            value={formData.phoneNumber || ""}
            onChange={(e) => handleUpdateField("phoneNumber", e.target.value)}
            className={inputCls}
            autoComplete="tel"
          />
        </div>
      </div>

      {/* Postcode search — hidden once an address is selected (no duplicate field) */}
      {!showDetails && (
        <form onSubmit={onSearch} className="flex items-end gap-3">
          <div className="flex-1 input-group">
            <label className={labelCls}>
              Postcode <span className="text-red-500" title="Required">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. NW1 6XE"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className={inputCls}
              autoComplete="postal-code"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60 shrink-0"
          >
            {searching ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Invalid postcode */}
      {searched && postcodeValid === false && !showDetails && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          That postcode could not be validated. Check it and try again, or{" "}
          <button
            type="button"
            onClick={() => setManual(true)}
            className="font-bold underline"
          >
            enter the address manually
          </button>
          .
        </div>
      )}

      {/* Address list */}
      {searched && postcodeValid && addresses.length > 0 && !showDetails && (
        <div className="rounded-2xl border border-border bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-900">
              {addresses.length} address{addresses.length === 1 ? "" : "es"} in{" "}
              {(postcode || formData.postcode).toUpperCase()}
            </h4>
            <button
              type="button"
              onClick={() => setManual(true)}
              className="text-xs font-semibold text-primary"
            >
              Not listed? Enter manually
            </button>
          </div>
          <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {addresses.map((a, i) => (
              <li key={`${a.address}-${i}`}>
                <button
                  type="button"
                  onClick={() => selectAddress(a.address, a.uprn)}
                  className="w-full text-left py-2.5 px-1 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-lg"
                >
                  <span className="flex items-center gap-2 text-sm text-slate-800">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    {a.address}
                  </span>
                  <span className="text-xs font-bold text-primary shrink-0">
                    Select →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Address fields (revealed after selection or manual opt-in) */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex flex-col gap-5"
        >
          {/* Row: Door No, Street No, Building Name */}
          <div className="grid grid-cols-[80px_80px_1fr] gap-4">
            <div className="input-group">
              <label className={labelCls}>Door No</label>
              <input
                type="text"
                placeholder="00"
                value={formData.doorNo || ""}
                onChange={(e) => handleUpdateField("doorNo", e.target.value)}
                className={inputCls}
                autoComplete="address-line1"
              />
            </div>
            <div className="input-group">
              <label className={labelCls}>Street No</label>
              <input
                type="text"
                placeholder="00"
                value={formData.streetNo || ""}
                onChange={(e) => handleUpdateField("streetNo", e.target.value)}
                className={inputCls}
                autoComplete="off"
              />
            </div>
            <div className="input-group">
              <label className={labelCls}>Building Name</label>
              <input
                type="text"
                placeholder="e.g. Skyline Towers"
                value={formData.buildingName || ""}
                onChange={(e) =>
                  handleUpdateField("buildingName", e.target.value)
                }
                className={inputCls}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Street */}
          <div className="input-group">
            <label className={labelCls}>
              Street <span className="text-red-500" title="Required">*</span>
            </label>
            <input
              type="text"
              placeholder="Street Name"
              value={formData.street || ""}
              onChange={(e) => handleUpdateField("street", e.target.value)}
              className={inputCls}
              autoComplete="address-line2"
            />
          </div>

          {/* Postcode (single, editable) + Date */}
          <div className="grid grid-cols-[120px_1fr] gap-4">
            <div className="input-group">
              <label className={labelCls}>
                Postcode{" "}
                <span className="text-red-500" title="Required">*</span>
              </label>
              <input
                type="text"
                placeholder="Postcode"
                value={formData.postcode || ""}
                onChange={(e) => handleUpdateField("postcode", e.target.value)}
                className={inputCls}
                autoComplete="postal-code"
              />
            </div>
            <div className="input-group">
              <label className={labelCls}>Date of Inspection</label>
              <input
                type="date"
                value={formData.assessmentDate || ""}
                readOnly
                className="w-full py-3.5 px-4 rounded-xl border border-border bg-slate-100 cursor-not-allowed text-slate-500 text-[15px] outline-none transition-all shadow-sm"
                autoComplete="off"
              />
            </div>
          </div>

          {!formData.evidenceLoaded && addresses.length > 0 && (
            <button
              type="button"
              onClick={() => setManual(false)}
              className="self-start text-xs font-semibold text-slate-500"
            >
              ← Back to the address list
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ClientInfoStep;
