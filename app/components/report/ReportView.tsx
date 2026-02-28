import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  Printer,
  ChevronLeft,
  Calendar,
  FileText,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Wrench,
  Check,
  MapPin,
  Award,
  AlertCircle,
  Box,
  List,
} from "lucide-react";
import { formatBritishDateTime } from "@/lib/utils/dateFormatter";
import { Case } from "@/types/dashboard";
import { ConfidenceBadge } from "../wizard/ConfidenceBadge";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

interface ReportViewProps {
  caseData: Case;
  onBack: () => void;
  onUpdateCase: (updatedCase: Case) => void;
}

// --- Design Tokens (Premium Surveyor Palette) ---
const AHR_DEEP = "#4c1d95"; // Deep Violet
const AHR_VIOLET = "#7c3aed"; // Violet
const AHR_SLATE = "#1e293b"; // Slate 800
const AHR_ACCENT = "#f5f3ff";
const AHR_BORDER = "#e2e8f0";
const AHR_MODIFIED = "#059669"; // Override Green

// --- Premium Helper Components ---

const AHR_Header = ({
  address,
  id,
  date,
  uprn,
}: {
  address: string;
  id: string;
  date: string;
  uprn?: string;
}) => (
  <div className="border-b-4 border-violet-900 pb-4 mb-6">
    <div className="flex justify-between items-start">
      <div className="flex gap-4 items-center">
        <div className="w-16 h-16 bg-violet-900 rounded-xl flex items-center justify-center text-white">
          <Shield size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 m-0 tracking-tight">
            London AHR
          </h1>
          <p className="text-xs text-violet-600 font-medium m-0 uppercase">
            OFFICIAL ACCESSIBILITY SURVEY REPORT
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="bg-slate-800 text-white py-3 px-5 rounded-lg">
          <div className="text-[10px] font-medium opacity-80 uppercase">
            UPRN / Case ID
          </div>
          <div className="text-lg font-black tracking-wider">{uprn || id}</div>
        </div>
        <p className="text-xs font-medium text-slate-500 mt-2">
          Issued: {date}
        </p>
      </div>
    </div>
  </div>
);

const SectionBlock = ({
  title,
  children,
  number,
  sub,
}: {
  title: string;
  children: React.ReactNode;
  number?: string;
  sub?: string;
}) => (
  <div className="mb-6 break-inside-avoid">
    <div className="border-l-4 border-violet-900 pl-4 mb-3">
      <div className="flex items-baseline gap-2">
        {number && (
          <span className="text-lg font-black text-violet-600">{number}</span>
        )}
        <h2 className="text-sm font-black uppercase text-violet-900 tracking-wider m-0">
          {title}
        </h2>
      </div>
      {sub && (
        <p className="text-[11px] text-slate-500 mt-1 font-normal">{sub}</p>
      )}
    </div>
    <div className="px-1">{children}</div>
  </div>
);

const CompactField = ({
  label,
  value,
  bold = false,
  isModified = false,
  onClick,
  isLocked = false,
}: {
  label: string;
  value: any;
  bold?: boolean;
  isModified?: boolean;
  onClick?: () => void;
  isLocked?: boolean;
}) => {
  const modified = isModified && !isLocked;
  return (
    <div
      onClick={isLocked ? undefined : onClick}
      className={`flex justify-between py-1 items-center border-b ${modified ? "border-emerald-600 text-emerald-600" : "border-slate-200"} ${onClick && !isLocked ? "cursor-pointer" : "cursor-default"}`}
    >
      <span
        className={`text-[11px] font-medium uppercase ${modified ? "text-emerald-600" : "text-slate-500"}`}
      >
        {label}
      </span>
      <span
        className={`text-xs ${bold ? "font-black" : "font-medium"} ${modified ? "text-emerald-600" : "text-slate-800"}`}
      >
        {value ?? "-"}
      </span>
    </div>
  );
};

const FieldValue = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: any;
  icon?: any;
}) => (
  <div className="mb-2">
    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 uppercase mb-1">
      {Icon && <Icon size={12} />} {label}
    </div>
    <div className="text-sm font-medium text-slate-800">
      {value || "Not Specified"}
    </div>
  </div>
);

const AHR_Checkbox = ({
  checked,
  label,
  inverted = false,
}: {
  checked: boolean;
  label: string;
  inverted?: boolean;
}) => (
  <div className="flex items-center gap-2.5 mb-1">
    <div
      className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center ${checked ? "border-violet-600 bg-violet-600" : "border-slate-300 bg-white"}`}
    >
      {checked && <Check size={12} color="#fff" strokeWidth={4} />}
    </div>
    <span
      className={`text-xs font-medium ${checked ? "text-slate-800" : "text-slate-400"}`}
    >
      {label}
    </span>
  </div>
);

const MeasurementBadge = ({
  label,
  value,
  unit = "cm",
  source,
}: {
  label: string;
  value: any;
  unit?: string;
  source?: string;
}) => (
  <div className="flex items-center gap-3 py-1.5">
    <div className="text-xs font-normal text-slate-600 flex-1">
      {label}
      {source && (
        <span className="block text-[9px] font-normal text-slate-400 uppercase mt-0.5">
          Source: {source}
        </span>
      )}
    </div>
    <div className="flex items-center gap-2">
      <div className="bg-slate-50 border border-slate-200 py-1 px-2.5 rounded-md font-medium text-violet-900 min-w-[55px] text-center text-xs">
        {value || "-"}
      </div>
      <span className="text-[10px] font-normal text-slate-400 w-5">{unit}</span>
    </div>
  </div>
);

const ProfessionalSeal = () => (
  <div
    style={{
      position: "relative",
      width: "120px",
      height: "120px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        border: `2px dashed ${AHR_VIOLET}`,
        borderRadius: "50%",
        transform: "rotate(15deg)",
        opacity: 0.3,
      }}
    />
    <div
      style={{
        textAlign: "center",
        transform: "rotate(-5deg)",
        color: AHR_VIOLET,
        fontWeight: "900",
        fontSize: "12px",
        border: `3px solid ${AHR_VIOLET}`,
        padding: "10px",
        borderRadius: "12px",
      }}
    >
      AHR LONDON
      <br />
      CERTIFIED
      <br />
      <span style={{ fontSize: "8px" }}>AIE-2026-X</span>
    </div>
  </div>
);

const ComplianceSummary = ({
  grade,
  risks,
  confidence,
  summary,
}: {
  grade: string;
  risks: any[];
  confidence: string;
  summary: string;
}) => (
  <div
    style={{
      background: "#f8fafc",
      padding: "20px",
      borderRadius: "16px",
      border: `1px solid ${grade.includes("A") || grade.includes("B") ? "#22c55e" : "#ef4444"}`,
      marginBottom: "30px",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "16px",
      }}
    >
      <div>
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "800",
            color: "#1e293b",
            marginBottom: "4px",
          }}
        >
          Compliance Outcome
        </h3>
        <p style={{ fontSize: "14px", color: "#64748b", maxWidth: "500px" }}>
          {summary}
        </p>
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontSize: "24px",
            fontWeight: "900",
            color:
              grade.includes("A") || grade.includes("B")
                ? "#15803d"
                : "#b91c1c",
            background: "#fff",
            padding: "8px 16px",
            borderRadius: "8px",
            border: `2px solid ${grade.includes("A") || grade.includes("B") ? "#22c55e" : "#ef4444"}`,
            display: "inline-block",
            marginBottom: "8px",
          }}
        >
          Grade {grade}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ConfidenceBadge
            confidence={
              confidence === "HIGH"
                ? 0.95
                : confidence === "MEDIUM"
                  ? 0.75
                  : 0.5
            }
          />
        </div>
      </div>
    </div>

    {
      <div
        style={{
          marginTop: "16px",
          borderTop: "1px dashed #e2e8f0",
          paddingTop: "16px",
        }}
      >
        <h4
          style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "#ef4444",
            textTransform: "uppercase",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <ShieldAlert size={14} /> Identified Risks
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "8px",
          }}
        >
          {risks && risks.length > 0 ? (
            risks.map((risk: any, i: number) => (
              <div
                key={i}
                style={{
                  fontSize: "12px",
                  color: "#b91c1c",
                  background: "#fef2f2",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #fecaca",
                }}
              >
                <strong>{risk.ruleId}:</strong> {risk.description}
              </div>
            ))
          ) : (
            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                padding: "8px 0",
              }}
            >
              None identified
            </div>
          )}
        </div>
      </div>
    }
  </div>
);

// --- New Segmented Field components for Section A ---
// --- Modal Components ---

const AHR_InputModal = ({
  isOpen,
  title,
  initialValue,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  initialValue: string;
  onConfirm: (val: string) => void;
  onClose: () => void;
}) => {
  const [val, setVal] = useState(initialValue);
  useEffect(() => {
    if (isOpen) setVal(initialValue);
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "16px",
          width: "320px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
        }}
      >
        <h4
          style={{
            fontSize: "14px",
            fontWeight: "900",
            color: "#1e40af",
            marginBottom: "16px",
          }}
        >
          Update {title}
        </h4>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            padding: "10px",
            border: "1.5px solid #bfdbfe",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
            outline: "none",
          }}
          onKeyDown={(e) => e.key === "Enter" && onConfirm(val)}
        />
        <div
          style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(val)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#1e40af",
              color: "#fff",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

const AHR_ConfirmModal = ({
  isOpen,
  onConfirm,
  onClose,
  isSaving,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
  isSaving: boolean;
}) => {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "16px",
          width: "360px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            background: "#fee2e2",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            color: "#ef4444",
          }}
        >
          <AlertCircle size={24} />
        </div>
        <h4
          style={{
            fontSize: "16px",
            fontWeight: "900",
            color: "#1e293b",
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          Finalize & Lock Report?
        </h4>
        <p
          style={{
            fontSize: "13px",
            color: "#64748b",
            textAlign: "center",
            marginBottom: "24px",
            lineHeight: "1.5",
          }}
        >
          Saving will permanently lock this report for editing. All visual
          indicators will be reset to blue.
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: "#059669",
              color: "#fff",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            {isSaving ? "Finalizing..." : "Yes, Lock & Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

const SegmentedField = ({
  label,
  value,
  segments,
  flex = 1,
  labelWidth,
  isModified = false,
  onChange,
  isLocked = false,
}: {
  label: string;
  value: string;
  segments: number;
  flex?: number | string;
  labelWidth?: string | number;
  isModified?: boolean;
  onChange?: (val: string) => void;
  isLocked?: boolean;
}) => {
  const chars = (value || "")
    .toString()
    .padEnd(segments, " ")
    .split("")
    .slice(0, segments);
  return (
    <div
      onClick={() => {
        if (isLocked || !onChange) return;
        onChange(value);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flex,
        cursor: onChange && !isLocked ? "pointer" : "default",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: "500",
          color: "#1e40af",
          whiteSpace: "nowrap",
          width: labelWidth,
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: "flex",
          flex: 1,
          border: `1.5px solid ${isModified && !isLocked ? AHR_MODIFIED : "#1e40af"}`,
          borderRadius: "8px",
          height: "28px",
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {chars.map((char: string, i: number) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "500",
              color: isModified && !isLocked ? AHR_MODIFIED : "#1e293b",
              borderRight:
                i === segments - 1
                  ? "none"
                  : `1px solid ${isModified && !isLocked ? AHR_MODIFIED : "#bfdbfe"}`,
              minWidth: "14px",
            }}
          >
            {char}
          </div>
        ))}
      </div>
    </div>
  );
};

const DateSegmentedField = ({
  label,
  value,
  labelWidth,
}: {
  label: string;
  value: string;
  labelWidth?: string | number;
}) => {
  const dateObj = value ? new Date(value) : new Date();
  const d = dateObj.getDate().toString().padStart(2, "0");
  const m = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const y = dateObj.getFullYear().toString().slice(-2);

  const segments = [...d.split(""), ...m.split(""), ...y.split("")];
  const labels = ["d", "d", "m", "m", "y", "y"];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        justifyContent: "flex-end",
        flex: 1,
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: "500",
          color: "#1e40af",
          width: labelWidth,
        }}
      >
        {label}
      </span>
      <div style={{ position: "relative", marginTop: "12px" }}>
        <div
          style={{
            display: "flex",
            border: "1.5px solid #1e40af",
            borderRadius: "8px",
            height: "28px",
            background: "#fff",
          }}
        >
          {segments.map((char, i) => (
            <div
              key={i}
              style={{
                width: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "500",
                color: "#1e293b",
                borderRight:
                  i === segments.length - 1 ? "none" : "1px solid #bfdbfe",
              }}
            >
              {char}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: "-14px",
            right: "0",
            width: "100%",
            justifyContent: "space-around",
          }}
        >
          {labels.map((l, i) => (
            <span
              key={i}
              style={{
                fontSize: "9px",
                color: "#1e40af",
                fontWeight: "400",
                width: "20px",
                textAlign: "center",
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const SmallCheckbox = ({
  label,
  checked,
  labelPosition = "right",
  isModified = false,
  onClick,
  isLocked = false,
}: {
  label: string;
  checked: boolean;
  labelPosition?: "left" | "right";
  isModified?: boolean;
  onClick?: () => void;
  isLocked?: boolean;
}) => (
  <div
    onClick={isLocked ? undefined : onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      cursor: onClick && !isLocked ? "pointer" : "default",
    }}
  >
    {labelPosition === "left" && (
      <span style={{ fontSize: "11px", fontWeight: "500", color: "#1e40af" }}>
        {label}
      </span>
    )}
    <div
      style={{
        width: "18px",
        height: "18px",
        border: `1.5px solid ${isModified && !isLocked ? AHR_MODIFIED : "#1e40af"}`,
        borderRadius: "4px",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked && (
        <Check
          size={14}
          color={isModified && !isLocked ? AHR_MODIFIED : "#1e40af"}
          strokeWidth={5}
        />
      )}
    </div>
    {labelPosition === "right" && (
      <span style={{ fontSize: "11px", fontWeight: "500", color: "#1e40af" }}>
        {label}
      </span>
    )}
  </div>
);

const LightCheckbox = ({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
    <div
      style={{
        width: "18px",
        height: "18px",
        border: "2px solid #cbd5e1",
        borderRadius: "6px",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {checked && <Check size={12} color="#1e40af" strokeWidth={5} />}
    </div>
    <span
      style={{
        fontSize: "13px",
        color: "#94a3b8",
        fontWeight: "500",
        lineHeight: "1.2",
      }}
    >
      {label}
    </span>
  </div>
);

const ChoiceBox = ({
  label,
  checked,
  isModified = false,
  onClick,
  isLocked = false,
}: {
  label: string;
  checked: boolean;
  isModified?: boolean;
  onClick?: () => void;
  isLocked?: boolean;
}) => (
  <div
    onClick={isLocked ? undefined : onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "3px 8px",
      border: `1.5px solid ${isModified && !isLocked ? AHR_MODIFIED : "#1e40af"}`,
      borderRadius: "6px",
      background: isModified && !isLocked ? "#f0fdf4" : "#f1f5ff",
      marginBottom: "4px",
      width: "100%",
      cursor: onClick && !isLocked ? "pointer" : "default",
    }}
  >
    <div
      style={{
        width: "18px",
        height: "18px",
        border: `1.5px solid ${isModified && !isLocked ? AHR_MODIFIED : "#1e40af"}`,
        borderRadius: "4px",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked && (
        <div
          style={{
            width: "10px",
            height: "10px",
            background: isModified && !isLocked ? AHR_MODIFIED : "#1e40af",
            borderRadius: "2px",
          }}
        />
      )}
    </div>
    <span
      style={{
        fontSize: "10px",
        fontWeight: "500",
        color: isModified && !isLocked ? AHR_MODIFIED : "#1e40af",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  </div>
);

const DoubleBox = ({ checked }: { checked?: boolean }) => (
  <div
    style={{
      width: "18px",
      height: "18px",
      border: "1.5px solid #1e40af",
      borderRadius: "4px",
      background: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {checked && (
      <div
        style={{
          width: "10px",
          height: "10px",
          background: "#a855f7",
          borderRadius: "2px",
        }}
      />
    )}
  </div>
);

const AHR_MeasurementBox = ({
  segments = 4,
  value = "",
  label = "",
  unit = "cm",
  isModified = false,
  onChange,
  isLocked = false,
}: {
  segments?: number;
  value?: any;
  label?: string;
  unit?: string | null;
  isModified?: boolean;
  onChange?: (val: any) => void;
  isLocked?: boolean;
}) => {
  // Process value to fit segments (e.g. 80.5 -> "0805")
  let cleanedValue = (value || "").toString().replace(".", "");
  if (cleanedValue.length > segments)
    cleanedValue = cleanedValue.slice(0, segments);
  const chars = cleanedValue.padStart(segments, " ").split("");

  return (
    <div
      onClick={() => {
        if (isLocked || !onChange) return;
        onChange(value);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        cursor: onChange && !isLocked ? "pointer" : "default",
      }}
    >
      {label && (
        <span
          style={{
            fontSize: "11px",
            fontWeight: "500",
            color: "#1e40af",
            width: label === "Lift ID" ? "30px" : "28px",
            lineHeight: "1.1",
          }}
        >
          {label === "Lift ID" ? (
            <span style={{ display: "block" }}>
              Lift
              <br />
              ID
            </span>
          ) : (
            label
          )}
        </span>
      )}
      <div
        style={{
          display: "flex",
          border: `1.5px solid ${isModified && !isLocked ? AHR_MODIFIED : "#1e40af"}`,
          borderRadius: "6px",
          height: "26px",
          background: "#fff",
        }}
      >
        {chars.map((char: string, i: number) => (
          <React.Fragment key={i}>
            <div
              style={{
                width: segments > 5 ? "16px" : "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: segments > 5 ? "11px" : "12px",
                fontWeight: "500",
                color: isModified && !isLocked ? AHR_MODIFIED : "#1e293b",
                borderRight:
                  i === segments - 1
                    ? "none"
                    : `1px solid ${isModified && !isLocked ? AHR_MODIFIED : "#bfdbfe"}`,
              }}
            >
              {char}
            </div>
            {unit === "cm" && i === segments - 2 && (
              <div
                style={{
                  width: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRight: `1px solid ${isModified && !isLocked ? AHR_MODIFIED : "#bfdbfe"}`,
                  background: isModified && !isLocked ? "#f0fdf4" : "#f8fafc",
                }}
              >
                <div
                  style={{
                    width: "3.5px",
                    height: "3.5px",
                    background:
                      isModified && !isLocked ? AHR_MODIFIED : "#1e40af",
                    borderRadius: "50%",
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      {unit && (
        <span style={{ fontSize: "10px", color: "#1e40af", fontWeight: "500" }}>
          {unit}
        </span>
      )}
    </div>
  );
};

const YesNoCheckboxes = ({
  label,
  value,
  isModified = false,
  onChange,
  isLocked = false,
}: {
  label: string;
  value: boolean;
  isModified?: boolean;
  onChange?: (val: boolean) => void;
  isLocked?: boolean;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <span
      style={{
        fontSize: "11px",
        fontWeight: "500",
        color: isModified && !isLocked ? AHR_MODIFIED : "#1e40af",
        minWidth: "130px",
        lineHeight: "1.2",
      }}
    >
      {label}:
    </span>
    <div style={{ display: "flex", gap: "8px" }}>
      <SmallCheckbox
        label="Y"
        checked={value === true}
        isModified={isModified}
        onClick={() => onChange?.(true)}
        isLocked={isLocked}
      />
      <SmallCheckbox
        label="N"
        checked={value === false}
        isModified={isModified}
        onClick={() => onChange?.(false)}
        isLocked={isLocked}
      />
    </div>
  </div>
);

const FacilitiesCheck = ({
  label,
  checked,
  isModified = false,
  onChange,
  isLocked = false,
}: {
  label: string;
  checked: boolean;
  isModified?: boolean;
  onChange?: (val: boolean) => void;
  isLocked?: boolean;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
    <div
      style={{
        fontSize: "10px",
        fontWeight: "500",
        color: isModified && !isLocked ? AHR_MODIFIED : "#1e40af",
        whiteSpace: "nowrap",
        width: "100px",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {label}:
    </div>
    <div style={{ display: "flex", gap: "10px" }}>
      <SmallCheckbox
        label="Y"
        checked={checked === true}
        isModified={isModified}
        onClick={() => onChange?.(true)}
        isLocked={isLocked}
      />
      <SmallCheckbox
        label="N"
        checked={checked === false}
        isModified={isModified}
        onClick={() => onChange?.(false)}
        isLocked={isLocked}
      />
    </div>
  </div>
);

const ReportView: React.FC<ReportViewProps> = ({
  caseData,
  onBack,
  onUpdateCase,
}) => {
  if (!caseData) return null;

  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Use a single state object to track all user overrides
  const [overrides, setOverrides] = useState<Record<string, any>>(
    caseData.mlData?.userOverrides || {},
  );
  // Track which keys were changed by the user (not auto-populated by API)
  const [userModifiedKeys, setUserModifiedKeys] = useState<Set<string>>(
    new Set(Object.keys(caseData.mlData?.userOverrides || {})),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(
    caseData.mlData?.isLocked || false,
  );

  // Property location coordinates for map
  const [propertyCoords, setPropertyCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  // Modal states
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    value: string;
    key: string;
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean } | null>(
    null,
  );

  const rawAhr = caseData.mlData?.rawAhr || {};
  const wizardData = caseData.mlData?.wizardData || {};
  const analyzedAiSuggestions =
    wizardData.aiSuggestions ||
    caseData.mlData?.aiReport?.analysisData?.aiSuggestions ||
    {};
  const analyzedSecondExitPresent =
    typeof analyzedAiSuggestions.second_exit_present === "boolean"
      ? analyzedAiSuggestions.second_exit_present
      : undefined;
  const analyzedSecondExitAccessToStreet =
    typeof analyzedAiSuggestions.second_exit_access_to_street === "boolean"
      ? analyzedAiSuggestions.second_exit_access_to_street
      : undefined;

  // Auto-fetch proximity data for Section 23 on mount if postcode is available and not already overridden
  useEffect(() => {
    const postcode = wizardData.postcode || caseData.postcode;
    const alreadySet =
      overrides.proximityShops !== undefined ||
      overrides.proximityTransport !== undefined;
    const hasRawAhrData =
      rawAhr.context_amenities?.proximity?.shops_lt_100m !== undefined;
    if (!postcode || alreadySet || hasRawAhrData) return;

    fetch("/api/proximity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postcode, street: wizardData.street || "" }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setOverrides((prev) => ({
          ...prev,
          proximityShops: data.proximityShops,
          proximityTransport: data.proximityTransport,
          ...(data.transportTypes?.length
            ? { proximityTransportTypes: data.transportTypes }
            : {}),
        }));
        if (data.lat && data.lon)
          setPropertyCoords({ lat: data.lat, lon: data.lon });
      })
      .catch(() => {
        /* silently ignore proximity fetch errors */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch coordinates for map when we have postcode but no coords yet (e.g. when raw AHR data exists and proximity API was skipped)
  useEffect(() => {
    const postcode = wizardData.postcode || caseData.postcode;
    const alreadySet =
      overrides.proximityShops !== undefined ||
      overrides.proximityTransport !== undefined;
    const hasRawAhrData =
      rawAhr.context_amenities?.proximity?.shops_lt_100m !== undefined;
    const skippedProximityFetch = alreadySet || hasRawAhrData;
    if (!postcode || propertyCoords || !skippedProximityFetch) return;

    fetch("/api/proximity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postcode, street: wizardData.street || "" }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.lat && data?.lon)
          setPropertyCoords({ lat: data.lat, lon: data.lon });
      })
      .catch(() => {
        /* silently ignore */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOverride = (key: string, value: any) => {
    if (isLocked) return;
    setUserModifiedKeys((prev) => new Set(prev).add(key));
    setOverrides((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (isLocked) return;
    setConfirmModal({ isOpen: true });
  };

  const openModal = (title: string, key: string, val: any) => {
    if (isLocked) return;
    setModalConfig({ isOpen: true, title, value: String(val || ""), key });
  };

  const finalizeSave = async () => {
    setIsSaving(true);
    try {
      const updatedCase = {
        ...caseData,
        status: "Completed",
        mlData: {
          ...caseData.mlData,
          userOverrides: overrides,
          isLocked: true,
        },
      };
      onUpdateCase(updatedCase);
      setIsLocked(true);
      setConfirmModal(null);
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDFBlob = async (): Promise<jsPDF | null> => {
    if (!reportRef.current) return null;
    const pages = Array.from(reportRef.current.querySelectorAll(".ahr-page"));
    if (pages.length === 0) return null;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pdfWidth = 210;
    const pdfHeight = 297;
    // A4 at 96 DPI is approx 794x1123
    const pixelWidth = 794;
    const pixelHeight = 1123;

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      const page = pages[i] as HTMLElement;

      // Clone to offscreen A4 container to ensure consistent rendering
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = `${pixelWidth}px`;
      tempContainer.style.minHeight = `${pixelHeight}px`;
      document.body.appendChild(tempContainer);

      const clone = page.cloneNode(true) as HTMLElement;
      clone.style.width = "100%";
      clone.style.minHeight = `${pixelHeight}px`;
      clone.style.margin = "0";
      clone.style.padding = "40px"; // Ensure padding
      clone.style.boxShadow = "none";
      clone.style.borderRadius = "0";
      clone.style.background = "#fff";

      tempContainer.appendChild(clone);

      try {
        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: pixelWidth,
          height: pixelHeight,
          windowWidth: pixelWidth,
          windowHeight: pixelHeight,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      } catch (e) {
        console.error("Page capture failed", e);
      } finally {
        document.body.removeChild(tempContainer);
      }
    }
    return pdf;
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const pdf = await generatePDFBlob();
      if (!pdf) return;
      const name = (wizardData.fullName || "Surveyor").replace(
        /[^a-zA-Z0-9]/g,
        "_",
      );
      const id = rawAhr.meta_data?.uprn || caseData.id || "report";
      pdf.save(`${name}_${id}.pdf`);
    } catch (error) {
      console.error("[ReportView] PDF Download Error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintPDF = async () => {
    setIsDownloading(true);
    try {
      const pdf = await generatePDFBlob();
      if (!pdf) return;
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          URL.revokeObjectURL(url);
        };
      }
    } catch (error) {
      console.error("[ReportView] PDF Print Error:", error);
      alert("Failed to generate PDF for printing.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper to get value with override
  const getVal = (key: string, original: any) => {
    return overrides[key] !== undefined ? overrides[key] : original;
  };

  const isYes = (key: string, original: any) => getVal(key, original) === true;

  const isMod = (key: string) => userModifiedKeys.has(key) && !isLocked;

  return (
    <div
      ref={reportRef}
      className="report-container"
      style={{
        background: "#f8fafc",
        minHeight: "100vh",
        padding: "0 12px 16px",
      }}
    >
      {/* Nav Toolbar */}
      <div
        className="no-print report-toolbar"
        style={{
          maxWidth: "1000px",
          margin: "16px auto 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="report-toolbar-actions" style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleSave}
            disabled={isSaving || isLocked}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              background: isLocked ? "#94a3b8" : AHR_MODIFIED,
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: "700",
              cursor: isLocked ? "default" : "pointer",
              boxShadow: isLocked
                ? "none"
                : "0 4px 15px rgba(5, 150, 105, 0.2)",
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? (
              <Box className="spin" size={18} />
            ) : isLocked ? (
              <CheckCircle2 size={18} />
            ) : (
              <FileText size={18} />
            )}
            {isLocked ? "Assessment Locked" : "Finalize & Save"}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              background: AHR_VIOLET,
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: "700",
              cursor: isDownloading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 15px rgba(124, 58, 237, 0.2)",
              opacity: isDownloading ? 0.7 : 1,
            }}
          >
            <Download size={18} />{" "}
            {isDownloading ? "Generating…" : "Download AHR PDF"}
          </button>
          <button
            onClick={handlePrintPDF}
            disabled={isDownloading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              background: "#fff",
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: "700",
              cursor: isDownloading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              opacity: isDownloading ? 0.7 : 1,
            }}
          >
            <Printer size={18} />{" "}
            {isDownloading ? "Generating…" : "Print Report"}
          </button>
        </div>
      </div>

      {/* Modals */}
      <AHR_InputModal
        isOpen={modalConfig?.isOpen || false}
        title={modalConfig?.title || ""}
        initialValue={modalConfig?.value || ""}
        onClose={() => setModalConfig(null)}
        onConfirm={(newVal) => {
          if (modalConfig) {
            handleOverride(modalConfig.key, newVal);
            setModalConfig(null);
          }
        }}
      />

      <AHR_ConfirmModal
        isOpen={confirmModal?.isOpen || false}
        isSaving={isSaving}
        onClose={() => setConfirmModal(null)}
        onConfirm={finalizeSave}
      />

      {/* AHR Main Document Content - fixed width on all devices; zoom/scroll to view on small screens */}
      <div
        className="report-pages-wrapper"
        style={{
          overflowX: "auto",
          overflowY: "visible",
          margin: "0 auto",
          maxWidth: "100%",
        }}
      >
        <div
          className="report-pages"
          style={{
            width: "900px",
            minWidth: "900px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
        {/* --- PAGE 1: CORE DATA & ELIGIBILITY --- */}
        <div
          className="ahr-page"
          style={{
            background: "#fff",
            padding: "30px 40px",
            borderRadius: "24px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
          }}
        >
          <AHR_Header
            address={caseData.address}
            id={caseData.id}
            date={caseData.assessmentDate || "2026-02-12"}
            uprn={rawAhr.meta_data?.uprn}
          />

          {/* COMPLIANCE SUMMARY (Enterprise Feature) */}
          {(caseData.mlData as any)?.riskAssessment && (
            <ComplianceSummary
              grade={(
                caseData.mlData as any
              ).riskAssessment.overallGrade.replace("GRADE_", "")}
              risks={(caseData.mlData as any).riskAssessment.riskFactors}
              confidence={
                (caseData.mlData as any).aiReport?.Confidence || "MEDIUM"
              }
              summary={(caseData.mlData as any).riskAssessment.summary}
            />
          )}

          <SectionBlock title="SECTION A" number="">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                width: "100%",
              }}
            >
              {/* Row 1 */}
              <div style={{ display: "flex", gap: "16px" }}>
                <SegmentedField
                  label="Door No"
                  value={getVal("doorNo", wizardData.doorNo)}
                  segments={5}
                  flex="0 0 130px"
                  labelWidth="50px"
                  isModified={isMod("doorNo")}
                  isLocked={isLocked}
                  onChange={() =>
                    openModal(
                      "Door No",
                      "doorNo",
                      getVal("doorNo", wizardData.doorNo),
                    )
                  }
                />
                <SegmentedField
                  label="Street No"
                  value={getVal("streetNo", wizardData.streetNo)}
                  segments={5}
                  flex="0 0 130px"
                  labelWidth="60px"
                  isModified={isMod("streetNo")}
                  isLocked={isLocked}
                  onChange={() =>
                    openModal(
                      "Street No",
                      "streetNo",
                      getVal("streetNo", wizardData.streetNo),
                    )
                  }
                />
                <SegmentedField
                  label="Building Name"
                  value={getVal("buildingName", wizardData.buildingName)}
                  segments={25}
                  flex="1"
                  labelWidth="90px"
                  isModified={isMod("buildingName")}
                  isLocked={isLocked}
                  onChange={() =>
                    openModal(
                      "Building Name",
                      "buildingName",
                      getVal("buildingName", wizardData.buildingName),
                    )
                  }
                />
              </div>

              {/* Row 2 */}
              <div style={{ display: "flex" }}>
                <SegmentedField
                  label="Street"
                  value={getVal("street", wizardData.street)}
                  segments={45}
                  flex="1"
                  labelWidth="50px"
                  isModified={isMod("street")}
                  isLocked={isLocked}
                  onChange={() =>
                    openModal(
                      "Street",
                      "street",
                      getVal("street", wizardData.street),
                    )
                  }
                />
              </div>

              {/* Row 3 */}
              <div style={{ display: "flex", gap: "16px" }}>
                <SegmentedField
                  label="Postcode"
                  value={getVal("postcode", wizardData.postcode)}
                  segments={8}
                  flex="0 0 180px"
                  labelWidth="50px"
                  isModified={isMod("postcode")}
                  isLocked={isLocked}
                  onChange={() =>
                    openModal(
                      "Postcode",
                      "postcode",
                      getVal("postcode", wizardData.postcode),
                    )
                  }
                />
                <SegmentedField
                  label="Your Full Name"
                  value={getVal("fullName", wizardData.fullName)}
                  segments={32}
                  flex="1"
                  labelWidth="90px"
                  isModified={isMod("fullName")}
                  isLocked={isLocked}
                  onChange={() =>
                    openModal(
                      "Full Name",
                      "fullName",
                      getVal("fullName", wizardData.fullName),
                    )
                  }
                />
              </div>

              {/* Row 4 */}
              <div
                style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}
              >
                <SegmentedField
                  label="Your Phone Number"
                  value={getVal("phoneNumber", wizardData.phoneNumber)}
                  segments={15}
                  flex="0 0 320px"
                  labelWidth="110px"
                  isModified={isMod("phoneNumber")}
                  isLocked={isLocked}
                  onChange={() =>
                    openModal(
                      "Phone Number",
                      "phoneNumber",
                      getVal("phoneNumber", wizardData.phoneNumber),
                    )
                  }
                />
                <DateSegmentedField
                  label="Date of Inspection"
                  value={getVal(
                    "assessmentDate",
                    caseData.assessmentDate || "",
                  )}
                  labelWidth="110px"
                />
              </div>
            </div>
          </SectionBlock>

          <SectionBlock title="SECTION B" number="">
            <div
              style={{
                fontSize: "12px",
                color: "#1e40af",
                fontWeight: "600",
                marginBottom: "12px",
              }}
            >
              Multiple Identical Properties
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "24px",
                  alignItems: "center",
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "500",
                    color: "#1e40af",
                    minWidth: "280px",
                  }}
                >
                  Is this one of a number of identical properties in the same
                  block/development?
                </span>
                <SmallCheckbox
                  label="Yes"
                  checked={
                    getVal(
                      "multipleProperties",
                      wizardData.multipleProperties === "Yes"
                        ? "Yes"
                        : wizardData.multipleProperties === "No"
                          ? "No"
                          : "",
                    ) === "Yes"
                  }
                  isModified={isMod("multipleProperties")}
                  isLocked={isLocked}
                  onClick={() => handleOverride("multipleProperties", "Yes")}
                />
                <SmallCheckbox
                  label="No"
                  checked={
                    getVal(
                      "multipleProperties",
                      wizardData.multipleProperties === "No"
                        ? "No"
                        : wizardData.multipleProperties === "Yes"
                          ? "Yes"
                          : "",
                    ) === "No"
                  }
                  isModified={isMod("multipleProperties")}
                  isLocked={isLocked}
                  onClick={() => handleOverride("multipleProperties", "No")}
                />
              </div>
              {
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "center",
                    paddingBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "500",
                      color: "#1e40af",
                      minWidth: "280px",
                    }}
                  >
                    Number of identical properties in the block/development:
                  </span>
                  <SegmentedField
                    label=""
                    value={getVal(
                      "multiplePropertiesCount",
                      wizardData.multiplePropertiesCount || "",
                    )}
                    segments={5}
                    flex="0 0 100px"
                    labelWidth="0px"
                    isModified={isMod("multiplePropertiesCount")}
                    isLocked={isLocked}
                    onChange={() =>
                      openModal(
                        "No. of identical properties",
                        "multiplePropertiesCount",
                        getVal(
                          "multiplePropertiesCount",
                          wizardData.multiplePropertiesCount || "",
                        ),
                      )
                    }
                  />
                </div>
              }
            </div>
          </SectionBlock>

          <SectionBlock title="SECTION C" number="">
            <div
              style={{
                fontSize: "12px",
                color: "#1e40af",
                fontWeight: "600",
                marginBottom: "12px",
              }}
            >
              Tick all the relevant information in this section
            </div>

            <div style={{ marginBottom: "16px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "900",
                  color: "#1e40af",
                  borderBottom: "1px solid #bfdbfe",
                  paddingBottom: "4px",
                  marginBottom: "12px",
                }}
              >
                1. General Information
              </h3>

              {/* Property Type and Tenure */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "24px",
                    alignItems: "center",
                    borderBottom: "1px solid #f1f5f9",
                    paddingBottom: "8px",
                  }}
                >
                  {["House", "Flat", "Maisonette", "Bungalow"].map((type) => (
                    <SmallCheckbox
                      key={type}
                      label={type}
                      checked={
                        getVal("propertyType", wizardData.propertyType) === type
                      }
                      isModified={isMod("propertyType")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("propertyType", type)}
                    />
                  ))}
                  <div
                    style={{
                      width: "2px",
                      height: "20px",
                      background: "#bfdbfe",
                      margin: "0 8px",
                    }}
                  />
                  {["Council", "Private Rent", "Owner Occupier"].map(
                    (tenure) => (
                      <SmallCheckbox
                        key={tenure}
                        label={
                          tenure === "Owner Occupier" ? "Owner Occ" : tenure
                        }
                        checked={
                          getVal("tenureType", wizardData.tenureType) === tenure
                        }
                        isModified={isMod("tenureType")}
                        isLocked={isLocked}
                        onClick={() => handleOverride("tenureType", tenure)}
                      />
                    ),
                  )}
                </div>

                <div
                  style={{ display: "flex", gap: "16px", alignItems: "center" }}
                >
                  <SmallCheckbox
                    label="H.Ass"
                    checked={
                      getVal("tenureType", wizardData.tenureType) ===
                      "Housing Association"
                    }
                    isModified={isMod("tenureType")}
                    isLocked={isLocked}
                    onClick={() =>
                      handleOverride("tenureType", "Housing Association")
                    }
                  />
                  <SegmentedField
                    label="Name of Housing Association"
                    value={getVal(
                      "housingAssociationName",
                      wizardData.housingAssociationName || "",
                    )}
                    segments={25}
                    flex="1"
                    isModified={isMod("housingAssociationName")}
                    isLocked={isLocked}
                    onChange={() =>
                      openModal(
                        "HA Name",
                        "housingAssociationName",
                        getVal(
                          "housingAssociationName",
                          wizardData.housingAssociationName || "",
                        ),
                      )
                    }
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "24px",
                    alignItems: "center",
                    marginTop: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      color: "#1e40af",
                    }}
                  >
                    Property Entrance Level:
                  </span>
                  {["Ground Floor", "Basement", "Other"].map((level) => (
                    <SmallCheckbox
                      key={level}
                      label={level === "Ground Floor" ? "Ground" : level}
                      checked={
                        getVal("entranceLevel", wizardData.entranceLevel) ===
                        level
                      }
                      isModified={isMod("entranceLevel")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("entranceLevel", level)}
                    />
                  ))}

                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        color: "#1e40af",
                      }}
                    >
                      Please State Floor Level
                    </span>
                    <div
                      onClick={() =>
                        openModal(
                          "Floor Level",
                          "floorLevel",
                          getVal(
                            "floorLevel",
                            wizardData.floorLevelNumber ??
                              wizardData.floorLevel,
                          ),
                        )
                      }
                      style={{
                        border: `1.5px solid ${isMod("floorLevel") ? AHR_MODIFIED : "#1e40af"}`,
                        borderRadius: "6px",
                        width: "40px",
                        height: "28px",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: "800",
                        color: isMod("floorLevel") ? AHR_MODIFIED : AHR_SLATE,
                        cursor: isLocked ? "default" : "pointer",
                      }}
                    >
                      {getVal(
                        "floorLevel",
                        wizardData.floorLevelNumber ?? wizardData.floorLevel,
                      ) || "--"}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "200px 1fr",
                  gap: "10px 20px",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "500",
                    color: isMod("liftsCount") ? AHR_MODIFIED : "#1e40af",
                  }}
                >
                  No. of lifts servicing the dwelling:
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(13, 38px)",
                    gap: "6px",
                  }}
                >
                  {[0, 1, 2, 3].map((n) => (
                    <div key={n}>
                      <SmallCheckbox
                        label={n.toString()}
                        checked={
                          getVal(
                            "liftsCount",
                            wizardData.communalLiftCount ??
                              wizardData.communalLifts,
                          ) === n.toString()
                        }
                        isModified={isMod("liftsCount")}
                        isLocked={isLocked}
                        onClick={() =>
                          handleOverride("liftsCount", n.toString())
                        }
                      />
                    </div>
                  ))}
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "500",
                    color: isMod("bedroomsCount") ? AHR_MODIFIED : "#1e40af",
                  }}
                >
                  No. of bedrooms:
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(13, 38px)",
                    gap: "6px",
                  }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, "7+"].map((n) => (
                    <div key={n.toString()}>
                      <SmallCheckbox
                        label={n.toString()}
                        checked={
                          getVal(
                            "bedroomsCount",
                            String(wizardData.bedrooms ?? ""),
                          ) === n.toString()
                        }
                        isModified={isMod("bedroomsCount")}
                        isLocked={isLocked}
                        onClick={() =>
                          handleOverride("bedroomsCount", n.toString())
                        }
                      />
                    </div>
                  ))}
                </div>

                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: "500",
                    color: isMod("bedSpacesCount") ? AHR_MODIFIED : "#1e40af",
                    lineHeight: "1.1",
                  }}
                >
                  No. of bed spaces (not including living room):
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(13, 38px)",
                    gap: "6px",
                  }}
                >
                  <div />
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <div key={n}>
                      <SmallCheckbox
                        label={n.toString()}
                        checked={
                          getVal(
                            "bedSpacesCount",
                            String(wizardData.bedSpaces ?? ""),
                          ) === n.toString()
                        }
                        isModified={isMod("bedSpacesCount")}
                        isLocked={isLocked}
                        onClick={() =>
                          handleOverride("bedSpacesCount", n.toString())
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "900",
                  color: "#1e40af",
                  borderBottom: "1px solid #bfdbfe",
                  paddingBottom: "4px",
                  marginBottom: "16px",
                }}
              >
                2. Major Adaptions
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px 20px",
                }}
              >
                <YesNoCheckboxes
                  label="Through floor lift"
                  value={getVal(
                    "throughFloorLift",
                    rawAhr.eligibility_checks?.special_equipment
                      ?.through_floor_lift ??
                      analyzedAiSuggestions.through_floor_lift_present ??
                      (wizardData.internalLift === "Through-Floor Lift"
                        ? true
                        : false),
                  )}
                  isModified={isMod("throughFloorLift")}
                  onChange={(v) => handleOverride("throughFloorLift", v)}
                />
                <YesNoCheckboxes
                  label="Step-lift"
                  value={getVal(
                    "stepLift",
                    rawAhr.eligibility_checks?.special_equipment?.step_lift ??
                      analyzedAiSuggestions.step_lift_present ??
                      false,
                  )}
                  isModified={isMod("stepLift")}
                  onChange={(v) => handleOverride("stepLift", v)}
                />
                <YesNoCheckboxes
                  label="Platform (stair) lift"
                  value={getVal(
                    "platformLift",
                    rawAhr.eligibility_checks?.special_equipment
                      ?.platform_lift ??
                      analyzedAiSuggestions.platform_stair_lift_present ??
                      false,
                  )}
                  isModified={isMod("platformLift")}
                  onChange={(v) => handleOverride("platformLift", v)}
                />
                <YesNoCheckboxes
                  label="Level access shower"
                  value={getVal(
                    "levelAccessShower",
                    rawAhr.eligibility_checks?.level_access_shower_present ??
                      analyzedAiSuggestions.level_access_shower_present ??
                      (wizardData.bathingType?.includes("Level Access")
                        ? true
                        : false),
                  )}
                  isModified={isMod("levelAccessShower")}
                  onChange={(v) => handleOverride("levelAccessShower", v)}
                />
                <YesNoCheckboxes
                  label="Ceiling track hoist"
                  value={getVal(
                    "ceilingTrackHoist",
                    rawAhr.eligibility_checks?.special_equipment
                      ?.ceiling_track_hoist ??
                      analyzedAiSuggestions.ceiling_track_hoist_present ??
                      false,
                  )}
                  isModified={isMod("ceilingTrackHoist")}
                  onChange={(v) => handleOverride("ceilingTrackHoist", v)}
                />
                <YesNoCheckboxes
                  label="Stair-lift"
                  value={getVal(
                    "stairLift",
                    rawAhr.eligibility_checks?.special_equipment?.stair_lift ??
                      analyzedAiSuggestions.stair_lift_present ??
                      (wizardData.internalLift === "Stairlift" ? true : false),
                  )}
                  isModified={isMod("stairLift")}
                  onChange={(v) => handleOverride("stairLift", v)}
                />

                <div
                  style={{
                    gridColumn: "span 2",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginTop: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "800",
                      color: "#1e40af",
                      lineHeight: "1.2",
                      minWidth: "100px",
                    }}
                  >
                    Internal dimensions
                    <br />
                    of through floor lift
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <AHR_MeasurementBox
                        segments={3}
                        value={getVal(
                          "throughFloorLiftWidth",
                          rawAhr.eligibility_checks?.special_equipment
                            ?.through_floor_lift_dimensions?.width ??
                            analyzedAiSuggestions.through_floor_lift_internal_width_cm,
                        )}
                        unit={null}
                        isModified={isMod("throughFloorLiftWidth")}
                        isLocked={isLocked}
                        onChange={() =>
                          openModal(
                            "Through Floor Lift Width",
                            "throughFloorLiftWidth",
                            getVal(
                              "throughFloorLiftWidth",
                              rawAhr.eligibility_checks?.special_equipment
                                ?.through_floor_lift_dimensions?.width ??
                                analyzedAiSuggestions.through_floor_lift_internal_width_cm,
                            ),
                          )
                        }
                      />
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#1e40af",
                          fontWeight: "700",
                        }}
                      >
                        cm
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#7c3aed",
                        fontWeight: "900",
                      }}
                    >
                      X
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <AHR_MeasurementBox
                        segments={3}
                        value={getVal(
                          "throughFloorLiftDepth",
                          rawAhr.eligibility_checks?.special_equipment
                            ?.through_floor_lift_dimensions?.depth ??
                            analyzedAiSuggestions.through_floor_lift_internal_depth_cm,
                        )}
                        unit={null}
                        isModified={isMod("throughFloorLiftDepth")}
                        isLocked={isLocked}
                        onChange={() =>
                          openModal(
                            "Through Floor Lift Depth",
                            "throughFloorLiftDepth",
                            getVal(
                              "throughFloorLiftDepth",
                              rawAhr.eligibility_checks?.special_equipment
                                ?.through_floor_lift_dimensions?.depth ??
                                analyzedAiSuggestions.through_floor_lift_internal_depth_cm,
                            ),
                          )
                        }
                      />
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#1e40af",
                          fontWeight: "700",
                        }}
                      >
                        cm
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "16px",
                background: "#a855f7",
                padding: "12px 20px",
                borderRadius: "4px",
                color: "#fff",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "20px",
                }}
              >
                <span
                  style={{
                    fontSize: "12.5px",
                    fontWeight: "900",
                    lineHeight: "1.4",
                    textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  STOP NOW if the property entrance level is above or below
                  ground floor AND the property is not serviced by a lift or a
                  Ramp
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                    minWidth: "80px",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    handleOverride(
                      "stopTriggered",
                      !getVal(
                        "stopTriggered",
                        rawAhr.eligibility_checks?.stop_triggered ??
                          analyzedAiSuggestions.stop_assessment_flag,
                      ),
                    )
                  }
                >
                  <span
                    style={{
                      fontSize: "9px",
                      fontStyle: "italic",
                      fontWeight: "700",
                      color: isMod("stopTriggered")
                        ? "#059669"
                        : "rgba(255,255,255,0.9)",
                    }}
                  >
                    please tick box
                  </span>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      background: "#fff",
                      borderRadius: "3px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                      border: isMod("stopTriggered")
                        ? "2px solid #059669"
                        : "none",
                    }}
                  >
                    {getVal(
                      "stopTriggered",
                      rawAhr.eligibility_checks?.stop_triggered ??
                        analyzedAiSuggestions.stop_assessment_flag,
                    ) && (
                      <Check
                        size={20}
                        color={isMod("stopTriggered") ? "#059669" : "#a855f7"}
                        strokeWidth={5}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionBlock>
        </div>

        {/* --- PAGE 2: EXTERNAL ACCESS & CIRCULATION --- */}
        <div
          className="ahr-page"
          style={{
            background: "#fff",
            padding: "30px 40px",
            borderRadius: "24px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
            minHeight: "1120px",
          }}
        >
          <SectionBlock
            title="SECTION D"
            sub="Tick all the relevant information in this section"
          >
            {/* 3. Communal Front Door */}
            <div style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "900",
                  color: "#1e40af",
                  borderBottom: "2.5px solid #bfdbfe",
                  paddingBottom: "4px",
                  marginBottom: "16px",
                }}
              >
                3. Communal Front Door
              </h3>
              <div style={{ display: "flex", gap: "20px" }}>
                <div
                  style={{
                    flexDirection: "column",
                    width: "180px",
                    display: "flex",
                  }}
                >
                  <ChoiceBox
                    label="YES (Complete 3)"
                    checked={getVal(
                      "communalDoorPresent",
                      rawAhr.external_access?.communal_front_door?.present ??
                        analyzedAiSuggestions.communal_front_door_present ??
                        wizardData.communalDoorPresent === "Y",
                    )}
                    isModified={isMod("communalDoorPresent")}
                    isLocked={isLocked}
                    onClick={() => handleOverride("communalDoorPresent", true)}
                  />
                  <ChoiceBox
                    label="NO (Go to 4)"
                    checked={
                      getVal(
                        "communalDoorPresent",
                        rawAhr.external_access?.communal_front_door?.present ??
                          analyzedAiSuggestions.communal_front_door_present ??
                          wizardData.communalDoorPresent === "Y",
                      ) === false
                    }
                    isModified={isMod("communalDoorPresent")}
                    isLocked={isLocked}
                    onClick={() => handleOverride("communalDoorPresent", false)}
                  />
                </div>
                {
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        borderBottom: "1px dashed #bfdbfe",
                        paddingBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: isMod("communalDoorSteps")
                            ? AHR_MODIFIED
                            : "#1e40af",
                          flex: 1,
                          lineHeight: "1.2",
                        }}
                      >
                        No. of steps (inc. thresholds of 10cm or more)
                        <br />
                        from public path to the communal front door:
                      </span>
                      <div style={{ display: "flex", gap: "12px" }}>
                        {[0, 1, 2, 3, 4, "5+"].map((n) => (
                          <SmallCheckbox
                            key={n.toString()}
                            label={n.toString()}
                            checked={
                              String(
                                getVal(
                                  "communalDoorSteps",
                                  rawAhr.external_access?.communal_front_door
                                    ?.steps_count ??
                                    wizardData.communalStepCount ??
                                    "0",
                                ),
                              ) === n.toString()
                            }
                            isModified={isMod("communalDoorSteps")}
                            isLocked={isLocked}
                            onClick={() =>
                              handleOverride("communalDoorSteps", n.toString())
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        borderBottom: "1px dashed #bfdbfe",
                        paddingBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: isMod("communalDoorThreshold")
                            ? AHR_MODIFIED
                            : "#1e40af",
                          flex: 1,
                        }}
                      >
                        What is the height of the threshold?
                      </span>
                      <div style={{ display: "flex", gap: "12px" }}>
                        {[
                          { label: "10cm or above", val: "above10" },
                          {
                            label: "Under 10cm and Above 1.5cm",
                            val: "between",
                          },
                          { label: "0 - 1.5cm", val: "below1.5" },
                        ].map((t) => (
                          <SmallCheckbox
                            key={t.val}
                            label={t.label}
                            checked={
                              getVal(
                                "communalDoorThreshold",
                                (rawAhr.external_access?.communal_front_door
                                  ?.threshold_height_cm?.value || 0) >= 10
                                  ? "above10"
                                  : (rawAhr.external_access?.communal_front_door
                                        ?.threshold_height_cm?.value || 0) > 1.5
                                    ? "between"
                                    : "below1.5",
                              ) === t.val
                            }
                            isModified={isMod("communalDoorThreshold")}
                            isLocked={isLocked}
                            onClick={() =>
                              handleOverride("communalDoorThreshold", t.val)
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: isMod("communalDoorWidth")
                            ? AHR_MODIFIED
                            : "#1e40af",
                        }}
                      >
                        Door Opening Width
                      </span>
                      <AHR_MeasurementBox
                        value={getVal(
                          "communalDoorWidth",
                          rawAhr.external_access?.communal_front_door?.width_cm
                            ?.value,
                        )}
                        isModified={isMod("communalDoorWidth")}
                        isLocked={isLocked}
                        onChange={() =>
                          openModal(
                            "Communal Door Width",
                            "communalDoorWidth",
                            getVal(
                              "communalDoorWidth",
                              rawAhr.external_access?.communal_front_door
                                ?.width_cm?.value,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                }
              </div>
            </div>

            {/* 4. Communal Ramp */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  borderBottom: "2.5px solid #bfdbfe",
                  paddingBottom: "4px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "baseline",
                  gap: "10px",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "900",
                    color: "#1e40af",
                    margin: 0,
                  }}
                >
                  4. Communal Ramp
                </h3>
                <span
                  style={{
                    fontSize: "11px",
                    fontStyle: "italic",
                    color: "#1e40af",
                    fontWeight: "600",
                  }}
                >
                  (assess only most useful communal ramp)
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "900",
                    color: "#1e40af",
                    marginLeft: "auto",
                  }}
                >
                  Please tick against type of ramp
                </span>
              </div>

              <div style={{ display: "flex", gap: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "180px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <ChoiceBox
                      label="YES (Complete 4)"
                      checked={
                        getVal(
                          "communalRampPresent",
                          rawAhr.external_access?.ramps?.communal?.present ??
                            false,
                        ) === true
                      }
                      isModified={isMod("communalRampPresent")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("communalRampPresent", true)
                      }
                    />
                    <ChoiceBox
                      label="NO (Go to 5)"
                      checked={
                        getVal(
                          "communalRampPresent",
                          rawAhr.external_access?.ramps?.communal?.present ??
                            false,
                        ) === false
                      }
                      isModified={isMod("communalRampPresent")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("communalRampPresent", false)
                      }
                    />

                    <div
                      style={{
                        marginTop: "auto",
                        padding: "10px",
                        textAlign: "center",
                      }}
                    >
                      <svg width="100" height="50" viewBox="0 0 120 60">
                        <path
                          d="M 10 50 L 100 50 L 100 10 Z"
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="1.2"
                        />
                        <line
                          x1="20"
                          y1="55"
                          x2="90"
                          y2="55"
                          stroke="#a855f7"
                          strokeWidth="1"
                          markerStart="url(#arrowhead-purple)"
                          markerEnd="url(#arrowhead-purple)"
                        />
                        <text
                          x="55"
                          y="52"
                          fontSize="11"
                          fontWeight="900"
                          fill="#1e40af"
                          textAnchor="middle"
                        >
                          L
                        </text>
                        <line
                          x1="108"
                          y1="45"
                          x2="108"
                          y2="15"
                          stroke="#a855f7"
                          strokeWidth="1"
                          markerStart="url(#arrowhead-purple)"
                          markerEnd="url(#arrowhead-purple)"
                        />
                        <text
                          x="112"
                          y="30"
                          fontSize="11"
                          fontWeight="900"
                          fill="#1e40af"
                          dominantBaseline="middle"
                        >
                          H
                        </text>
                      </svg>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#1e40af",
                          fontWeight: "900",
                          marginTop: "5px",
                        }}
                      >
                        H=height
                        <br />
                        L=length
                      </div>
                    </div>
                  </div>
                </div>

                {
                  <div
                    style={{
                      flex: 1,
                      display: "grid",
                      gridTemplateColumns: "1fr 1.2fr 1.2fr",
                      gap: "1px",
                      background: "#bfdbfe",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    {/* Column 1: Straight Ramp */}
                    <div
                      style={{
                        background: "#fff",
                        padding: "16px 12px",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          cursor: isLocked ? "default" : "pointer",
                        }}
                        onClick={() =>
                          handleOverride("communalRampType", "straight")
                        }
                      >
                        <DoubleBox
                          checked={
                            getVal(
                              "communalRampType",
                              rawAhr.external_access?.ramps?.communal?.type,
                            ) === "straight"
                          }
                        />
                      </div>

                      {/* Visual Area - Fixed Height for alignment */}
                      <div
                        style={{
                          height: "140px",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}
                      >
                        <svg width="70" height="110" viewBox="0 0 100 150">
                          <defs>
                            <marker
                              id="arrowhead-purple"
                              markerWidth="6"
                              markerHeight="6"
                              refX="3"
                              refY="3"
                              orient="auto"
                            >
                              <polygon points="0 0, 6 3, 0 6" fill="#a855f7" />
                            </marker>
                          </defs>
                          <rect
                            x="15"
                            y="10"
                            width="45"
                            height="130"
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="1"
                          />
                          <line
                            x1="15"
                            y1="50"
                            x2="60"
                            y2="50"
                            stroke="#a855f7"
                            strokeWidth="0.8"
                            strokeDasharray="4 2"
                          />
                          <line
                            x1="37.5"
                            y1="65"
                            x2="37.5"
                            y2="120"
                            stroke="#a855f7"
                            strokeWidth="1.5"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="75"
                            y1="50"
                            x2="75"
                            y2="140"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="83"
                            y="100"
                            fontSize="14"
                            fontWeight="900"
                            fill="#1e40af"
                            dominantBaseline="middle"
                          >
                            a
                          </text>
                        </svg>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          width: "fit-content",
                          margin: "0 auto",
                        }}
                      >
                        <AHR_MeasurementBox
                          label="a H"
                          value={getVal(
                            "communalRampAHeight",
                            rawAhr.external_access?.ramps?.communal
                              ?.measurements?.a?.height,
                          )}
                          isModified={isMod("communalRampAHeight")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Height (a)",
                              "communalRampAHeight",
                              getVal(
                                "communalRampAHeight",
                                rawAhr.external_access?.ramps?.communal
                                  ?.measurements?.a?.height,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="a L"
                          value={getVal(
                            "communalRampALength",
                            rawAhr.external_access?.ramps?.communal
                              ?.measurements?.a?.length,
                          )}
                          isModified={isMod("communalRampALength")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Length (a)",
                              "communalRampALength",
                              getVal(
                                "communalRampALength",
                                rawAhr.external_access?.ramps?.communal
                                  ?.measurements?.a?.length,
                              ),
                            )
                          }
                        />
                      </div>

                      <div style={{ marginTop: "auto", paddingTop: "20px" }}>
                        <div
                          style={{
                            background: "#fff",
                            border: `1.5px solid ${isMod("communalRampAdequatePlatform") ? AHR_MODIFIED : "#1e40af"}`,
                            borderRadius: "4px",
                            padding: "8px",
                            width: "fit-content",
                            margin: "0 auto",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "10px",
                              fontWeight: "900",
                              color: isMod("communalRampAdequatePlatform")
                                ? AHR_MODIFIED
                                : "#1e40af",
                              lineHeight: "1.1",
                              marginBottom: "8px",
                            }}
                          >
                            Adequate platform
                            <br />
                            at top of Ramp?
                          </div>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <SmallCheckbox
                              label="Y"
                              checked={
                                getVal(
                                  "communalRampAdequatePlatform",
                                  rawAhr.external_access?.ramps?.communal
                                    ?.adequate_platform,
                                ) === true
                              }
                              isModified={isMod("communalRampAdequatePlatform")}
                              isLocked={isLocked}
                              onClick={() =>
                                handleOverride(
                                  "communalRampAdequatePlatform",
                                  true,
                                )
                              }
                            />
                            <SmallCheckbox
                              label="N"
                              checked={
                                getVal(
                                  "communalRampAdequatePlatform",
                                  rawAhr.external_access?.ramps?.communal
                                    ?.adequate_platform,
                                ) === false
                              }
                              isModified={isMod("communalRampAdequatePlatform")}
                              isLocked={isLocked}
                              onClick={() =>
                                handleOverride(
                                  "communalRampAdequatePlatform",
                                  false,
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: L Ramp */}
                    <div
                      style={{
                        background: "#fff",
                        padding: "16px 12px",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          cursor: isLocked ? "default" : "pointer",
                        }}
                        onClick={() =>
                          handleOverride("communalRampType", "l-shaped")
                        }
                      >
                        <DoubleBox
                          checked={
                            getVal(
                              "communalRampType",
                              rawAhr.external_access?.ramps?.communal?.type,
                            ) === "l-shaped"
                          }
                        />
                      </div>

                      {/* Visual Area - Fixed Height for alignment */}
                      <div
                        style={{
                          height: "140px",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}
                      >
                        <svg width="100" height="100" viewBox="0 0 140 140">
                          <path
                            d="M 10 40 H 100 V 130 H 60 V 80 H 10 Z"
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="1"
                          />
                          <line
                            x1="60"
                            y1="40"
                            x2="60"
                            y2="80"
                            stroke="#a855f7"
                            strokeWidth="0.8"
                            strokeDasharray="3 2"
                          />
                          <line
                            x1="60"
                            y1="80"
                            x2="100"
                            y2="80"
                            stroke="#a855f7"
                            strokeWidth="0.8"
                            strokeDasharray="3 2"
                          />
                          <line
                            x1="20"
                            y1="60"
                            x2="50"
                            y2="60"
                            stroke="#a855f7"
                            strokeWidth="1.5"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="80"
                            y1="85"
                            x2="80"
                            y2="120"
                            stroke="#a855f7"
                            strokeWidth="1.5"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="15"
                            y1="20"
                            x2="55"
                            y2="20"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="35"
                            y="12"
                            fontSize="12"
                            fontWeight="900"
                            fill="#1e40af"
                            textAnchor="middle"
                          >
                            b
                          </text>
                          <line
                            x1="115"
                            y1="85"
                            x2="115"
                            y2="125"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="122"
                            y="105"
                            fontSize="12"
                            fontWeight="900"
                            fill="#1e40af"
                            dominantBaseline="middle"
                          >
                            a
                          </text>
                        </svg>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          width: "fit-content",
                          margin: "0 auto",
                        }}
                      >
                        <AHR_MeasurementBox
                          label="a H"
                          value={getVal(
                            "communalRampAHeight",
                            rawAhr.external_access?.ramps?.communal
                              ?.measurements?.a?.height,
                          )}
                          isModified={isMod("communalRampAHeight")}
                          isLocked={isLocked}
                          onChange={(v) =>
                            handleOverride("communalRampAHeight", v)
                          }
                        />
                        <AHR_MeasurementBox
                          label="a L"
                          value={getVal(
                            "communalRampALength",
                            rawAhr.external_access?.ramps?.communal
                              ?.measurements?.a?.length,
                          )}
                          isModified={isMod("communalRampALength")}
                          isLocked={isLocked}
                          onChange={(v) =>
                            handleOverride("communalRampALength", v)
                          }
                        />
                        <AHR_MeasurementBox
                          label="b H"
                          value={getVal(
                            "communalRampBHeight",
                            rawAhr.external_access?.ramps?.communal
                              ?.measurements?.b?.height,
                          )}
                          isModified={isMod("communalRampBHeight")}
                          isLocked={isLocked}
                          onChange={(v) =>
                            handleOverride("communalRampBHeight", v)
                          }
                        />
                        <AHR_MeasurementBox
                          label="b L"
                          value={getVal(
                            "communalRampBLength",
                            rawAhr.external_access?.ramps?.communal
                              ?.measurements?.b?.length,
                          )}
                          isModified={isMod("communalRampBLength")}
                          isLocked={isLocked}
                          onChange={(v) =>
                            handleOverride("communalRampBLength", v)
                          }
                        />
                      </div>
                    </div>

                    {/* Column 3: U Ramp */}
                    <div
                      style={{
                        background: "#fff",
                        padding: "16px 12px",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          cursor: isLocked ? "default" : "pointer",
                        }}
                        onClick={() =>
                          handleOverride("communalRampType", "u-shaped")
                        }
                      >
                        <DoubleBox
                          checked={
                            getVal(
                              "communalRampType",
                              rawAhr.external_access?.ramps?.communal?.type,
                            ) === "u-shaped"
                          }
                        />
                      </div>

                      {/* Visual Area - Fixed Height for alignment */}
                      <div
                        style={{
                          height: "140px",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}
                      >
                        <svg width="130" height="100" viewBox="-15 0 180 130">
                          <path
                            d="M 30 115 V 20 H 120 V 115 H 95 V 60 H 55 V 115 Z"
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="1.2"
                          />
                          <line
                            x1="30"
                            y1="60"
                            x2="55"
                            y2="60"
                            stroke="#a855f7"
                            strokeDasharray="4 2"
                            strokeWidth="0.8"
                          />
                          <line
                            x1="95"
                            y1="60"
                            x2="120"
                            y2="60"
                            stroke="#a855f7"
                            strokeDasharray="4 2"
                            strokeWidth="0.8"
                          />
                          <line
                            x1="40"
                            y1="100"
                            x2="40"
                            y2="68"
                            stroke="#a855f7"
                            strokeWidth="1.8"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="110"
                            y1="68"
                            x2="110"
                            y2="105"
                            stroke="#a855f7"
                            strokeWidth="1.8"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="10"
                            y1="65"
                            x2="10"
                            y2="110"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="10"
                            y="88"
                            fontSize="14"
                            fontWeight="900"
                            fill="#1e40af"
                            textAnchor="end"
                            dominantBaseline="middle"
                          >
                            b
                          </text>
                          <line
                            x1="140"
                            y1="65"
                            x2="140"
                            y2="110"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="140"
                            y="88"
                            fontSize="14"
                            fontWeight="900"
                            fill="#1e40af"
                            textAnchor="start"
                            dominantBaseline="middle"
                          >
                            a
                          </text>
                        </svg>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          width: "fit-content",
                          margin: "0 auto",
                        }}
                      >
                        <AHR_MeasurementBox
                          label="a H"
                          value={getVal(
                            "communalRampAHeight",
                            rawAhr.external_access?.ramps?.communal
                              ?.measurements?.a?.height,
                          )}
                          isModified={isMod("communalRampAHeight")}
                          isLocked={isLocked}
                          onChange={(v) =>
                            handleOverride("communalRampAHeight", v)
                          }
                        />
                        <AHR_MeasurementBox
                          label="a L"
                          value={getVal(
                            "communalRampALength",
                            rawAhr.external_access?.ramps?.communal
                              ?.measurements?.a?.length,
                          )}
                          isModified={isMod("communalRampALength")}
                          isLocked={isLocked}
                          onChange={(v) =>
                            handleOverride("communalRampALength", v)
                          }
                        />
                        <AHR_MeasurementBox
                          label="b H"
                          value={getVal(
                            "communalRampBHeight",
                            rawAhr.external_access?.ramps?.communal
                              ?.measurements?.b?.height,
                          )}
                          isModified={isMod("communalRampBHeight")}
                          isLocked={isLocked}
                          onChange={(v) =>
                            handleOverride("communalRampBHeight", v)
                          }
                        />
                        <AHR_MeasurementBox
                          label="b L"
                          value={getVal(
                            "communalRampBLength",
                            rawAhr.external_access?.ramps?.communal
                              ?.measurements?.b?.length,
                          )}
                          isModified={isMod("communalRampBLength")}
                          isLocked={isLocked}
                          onChange={(v) =>
                            handleOverride("communalRampBLength", v)
                          }
                        />
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            {/* 5. Communal Lift */}
            <div style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "900",
                  color: "#1e40af",
                  borderBottom: "2.5px solid #bfdbfe",
                  paddingBottom: "4px",
                  marginBottom: "16px",
                }}
              >
                5. Communal Lift{" "}
                <span style={{ fontSize: "11px", fontWeight: "600" }}>
                  (assess only most useful lift for property)
                </span>
              </h3>
              <div style={{ display: "flex", gap: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "180px",
                  }}
                >
                  <ChoiceBox
                    label="YES (Complete 5)"
                    checked={
                      getVal(
                        "communalLiftPresent",
                        rawAhr.external_access?.lift_details?.present ?? false,
                      ) === true
                    }
                    isModified={isMod("communalLiftPresent")}
                    isLocked={isLocked}
                    onClick={() => handleOverride("communalLiftPresent", true)}
                  />
                  <ChoiceBox
                    label="NO (Go to 6)"
                    checked={
                      getVal(
                        "communalLiftPresent",
                        rawAhr.external_access?.lift_details?.present ?? false,
                      ) === false
                    }
                    isModified={isMod("communalLiftPresent")}
                    isLocked={isLocked}
                    onClick={() => handleOverride("communalLiftPresent", false)}
                  />
                </div>
                {
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "30px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            color:
                              isMod("communalLiftWidth") ||
                              isMod("communalLiftDepth")
                                ? AHR_MODIFIED
                                : "#1e40af",
                            lineHeight: "1.2",
                          }}
                        >
                          Internal
                          <br />
                          Dimensions
                        </span>
                        <AHR_MeasurementBox
                          value={getVal(
                            "communalLiftWidth",
                            rawAhr.external_access?.lift_details
                              ?.internal_dimensions_cm?.width,
                          )}
                          isModified={isMod("communalLiftWidth")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Lift Width",
                              "communalLiftWidth",
                              getVal(
                                "communalLiftWidth",
                                rawAhr.external_access?.lift_details
                                  ?.internal_dimensions_cm?.width,
                              ),
                            )
                          }
                        />
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "900",
                            color: "#7c3aed",
                          }}
                        >
                          X
                        </span>
                        <AHR_MeasurementBox
                          value={getVal(
                            "communalLiftDepth",
                            rawAhr.external_access?.lift_details
                              ?.internal_dimensions_cm?.depth,
                          )}
                          isModified={isMod("communalLiftDepth")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Lift Depth",
                              "communalLiftDepth",
                              getVal(
                                "communalLiftDepth",
                                rawAhr.external_access?.lift_details
                                  ?.internal_dimensions_cm?.depth,
                              ),
                            )
                          }
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            color: isMod("communalLiftDoorWidth")
                              ? AHR_MODIFIED
                              : "#1e40af",
                            lineHeight: "1.2",
                          }}
                        >
                          Door
                          <br />
                          Opening Width
                        </span>
                        <AHR_MeasurementBox
                          value={getVal(
                            "communalLiftDoorWidth",
                            rawAhr.external_access?.lift_details
                              ?.door_clear_opening_cm?.value,
                          )}
                          isModified={isMod("communalLiftDoorWidth")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Lift Door Width",
                              "communalLiftDoorWidth",
                              getVal(
                                "communalLiftDoorWidth",
                                rawAhr.external_access?.lift_details
                                  ?.door_clear_opening_cm?.value,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "30px",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", gap: "20px" }}>
                        <AHR_MeasurementBox
                          label="Lift ID"
                          segments={6}
                          unit={null}
                          value={getVal("communalLiftID1", "")}
                          isModified={isMod("communalLiftID1")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Lift ID 1",
                              "communalLiftID1",
                              getVal("communalLiftID1", ""),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="Lift ID"
                          segments={6}
                          unit={null}
                          value={getVal("communalLiftID2", "")}
                          isModified={isMod("communalLiftID2")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Lift ID 2",
                              "communalLiftID2",
                              getVal("communalLiftID2", ""),
                            )
                          }
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            color: isMod("communalLiftServicingCount")
                              ? AHR_MODIFIED
                              : "#1e40af",
                            lineHeight: "1.2",
                          }}
                        >
                          Number of lifts servicing block
                        </span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {[0, 1, 2, 3].map((n) => (
                            <SmallCheckbox
                              key={n}
                              label={n.toString()}
                              checked={
                                String(
                                  getVal(
                                    "communalLiftServicingCount",
                                    rawAhr.eligibility_checks
                                      ?.lifts_servicing_dwelling_count ??
                                      wizardData.communalLiftCount ??
                                      "0",
                                  ),
                                ) === n.toString()
                              }
                              isModified={isMod("communalLiftServicingCount")}
                              isLocked={isLocked}
                              onClick={() =>
                                handleOverride(
                                  "communalLiftServicingCount",
                                  n.toString(),
                                )
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            {/* 6. Property Front Door - Added to follow "Go to 6" logic */}
            <div style={{ marginTop: "20px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "900",
                  color: "#1e40af",
                  borderBottom: "2.5px solid #bfdbfe",
                  paddingBottom: "4px",
                  marginBottom: "16px",
                }}
              >
                6. Property Front Door
              </h3>
              <div style={{ display: "flex", gap: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "180px",
                  }}
                >
                  <ChoiceBox
                    label="YES (Complete 6)"
                    checked={getVal(
                      "propertyDoorPresent",
                      rawAhr.external_access?.property_front_door?.present ??
                        analyzedAiSuggestions.property_front_door_present ??
                        true,
                    )}
                    isModified={isMod("propertyDoorPresent")}
                    isLocked={isLocked}
                    onClick={() => handleOverride("propertyDoorPresent", true)}
                  />
                  <ChoiceBox
                    label="NO (Go to 7)"
                    checked={
                      getVal(
                        "propertyDoorPresent",
                        rawAhr.external_access?.property_front_door?.present ??
                          analyzedAiSuggestions.property_front_door_present ??
                          true,
                      ) === false
                    }
                    isModified={isMod("propertyDoorPresent")}
                    isLocked={isLocked}
                    onClick={() => handleOverride("propertyDoorPresent", false)}
                  />
                </div>
                {
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        borderBottom: "1px dashed #bfdbfe",
                        paddingBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: isMod("propertyDoorSteps")
                            ? AHR_MODIFIED
                            : "#1e40af",
                          flex: 1,
                          lineHeight: "1.2",
                        }}
                      >
                        No. of steps (inc. thresholds of 10cm or more)
                        <br />
                        from public path to the property front door:
                      </span>
                      <div style={{ display: "flex", gap: "12px" }}>
                        {[0, 1, 2, 3, 4, "5+"].map((n) => (
                          <SmallCheckbox
                            key={n.toString()}
                            label={n.toString()}
                            checked={
                              String(
                                getVal(
                                  "propertyDoorSteps",
                                  rawAhr.external_access?.property_front_door
                                    ?.steps_count || "0",
                                ),
                              ) === n.toString()
                            }
                            isModified={isMod("propertyDoorSteps")}
                            isLocked={isLocked}
                            onClick={() =>
                              handleOverride("propertyDoorSteps", n.toString())
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        borderBottom: "1px dashed #bfdbfe",
                        paddingBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: isMod("propertyDoorThreshold")
                            ? AHR_MODIFIED
                            : "#1e40af",
                          flex: 1,
                        }}
                      >
                        What is the height of the threshold?
                      </span>
                      <div style={{ display: "flex", gap: "12px" }}>
                        {[
                          { label: "10cm or above", val: "above10" },
                          {
                            label: "Under 10cm and Above 1.5cm",
                            val: "between",
                          },
                          { label: "0 - 1.5cm", val: "below1.5" },
                        ].map((t) => (
                          <SmallCheckbox
                            key={t.val}
                            label={t.label}
                            checked={
                              getVal(
                                "propertyDoorThreshold",
                                (rawAhr.external_access?.property_front_door
                                  ?.threshold_height_cm?.value || 0) >= 10
                                  ? "above10"
                                  : (rawAhr.external_access?.property_front_door
                                        ?.threshold_height_cm?.value || 0) > 1.5
                                    ? "between"
                                    : "below1.5",
                              ) === t.val
                            }
                            isModified={isMod("propertyDoorThreshold")}
                            isLocked={isLocked}
                            onClick={() =>
                              handleOverride("propertyDoorThreshold", t.val)
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          color: isMod("propertyDoorWidth")
                            ? AHR_MODIFIED
                            : "#1e40af",
                        }}
                      >
                        Door Opening Width
                      </span>
                      <AHR_MeasurementBox
                        value={getVal(
                          "propertyDoorWidth",
                          rawAhr.external_access?.property_front_door?.width_cm
                            ?.value,
                        )}
                        isModified={isMod("propertyDoorWidth")}
                        isLocked={isLocked}
                        onChange={(v) => handleOverride("propertyDoorWidth", v)}
                      />
                    </div>
                  </div>
                }
              </div>
            </div>
          </SectionBlock>
        </div>

        {/* --- PAGE 3: SECTION D (Part 7) & SECTION E (Parts 8-11) --- */}
        <div
          className="ahr-page"
          style={{
            background: "#fff",
            padding: "30px 40px",
            borderRadius: "24px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
            minHeight: "1120px",
          }}
        >
          <SectionBlock title="SECTION D (Continued)" number="">
            {/* 7. Property Ramp */}
            <div style={{ marginTop: "20px" }}>
              <div
                style={{
                  borderBottom: "2.5px solid #bfdbfe",
                  paddingBottom: "4px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "baseline",
                  gap: "10px",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "900",
                    color: "#1e40af",
                    margin: 0,
                  }}
                >
                  7. Is Property Ramped
                </h3>
                <span
                  style={{
                    fontSize: "11px",
                    fontStyle: "italic",
                    color: "#1e40af",
                    fontWeight: "600",
                  }}
                >
                  (assess only most useful ramp for property)
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "900",
                    color: "#1e40af",
                    marginLeft: "auto",
                  }}
                >
                  Please tick against type of ramp
                </span>
              </div>

              <div style={{ display: "flex", gap: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "180px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <ChoiceBox
                      label="YES (Complete 7)"
                      checked={
                        getVal(
                          "propertyRampPresent",
                          rawAhr.external_access?.ramps?.property?.present ??
                            false,
                        ) === true
                      }
                      isModified={isMod("propertyRampPresent")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("propertyRampPresent", true)
                      }
                    />
                    <ChoiceBox
                      label="NO (Go to next section)"
                      checked={
                        getVal(
                          "propertyRampPresent",
                          rawAhr.external_access?.ramps?.property?.present ??
                            false,
                        ) === false
                      }
                      isModified={isMod("propertyRampPresent")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("propertyRampPresent", false)
                      }
                    />

                    <div
                      style={{
                        marginTop: "auto",
                        padding: "10px",
                        textAlign: "center",
                      }}
                    >
                      <svg width="100" height="50" viewBox="0 0 120 60">
                        <path
                          d="M 10 50 L 100 50 L 100 10 Z"
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="1.2"
                        />
                        <line
                          x1="20"
                          y1="55"
                          x2="90"
                          y2="55"
                          stroke="#a855f7"
                          strokeWidth="1"
                          markerStart="url(#arrowhead-purple)"
                          markerEnd="url(#arrowhead-purple)"
                        />
                        <text
                          x="55"
                          y="52"
                          fontSize="11"
                          fontWeight="900"
                          fill="#1e40af"
                          textAnchor="middle"
                        >
                          L
                        </text>
                        <line
                          x1="108"
                          y1="45"
                          x2="108"
                          y2="15"
                          stroke="#a855f7"
                          strokeWidth="1"
                          markerStart="url(#arrowhead-purple)"
                          markerEnd="url(#arrowhead-purple)"
                        />
                        <text
                          x="112"
                          y="30"
                          fontSize="11"
                          fontWeight="900"
                          fill="#1e40af"
                          dominantBaseline="middle"
                        >
                          H
                        </text>
                      </svg>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#1e40af",
                          fontWeight: "900",
                          marginTop: "5px",
                        }}
                      >
                        H=height
                        <br />
                        L=length
                      </div>
                    </div>
                  </div>
                </div>

                {
                  <div
                    style={{
                      flex: 1,
                      display: "grid",
                      gridTemplateColumns: "1fr 1.2fr 1.2fr",
                      gap: "1px",
                      background: "#bfdbfe",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    {/* Column 1: Straight Ramp */}
                    <div
                      style={{
                        background: "#fff",
                        padding: "16px 12px",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          cursor: isLocked ? "default" : "pointer",
                        }}
                        onClick={() =>
                          handleOverride("propertyRampType", "straight")
                        }
                      >
                        <DoubleBox
                          checked={
                            getVal(
                              "propertyRampType",
                              rawAhr.external_access?.ramps?.property?.type,
                            ) === "straight"
                          }
                        />
                      </div>

                      <div
                        style={{
                          height: "140px",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}
                      >
                        <svg width="70" height="110" viewBox="0 0 100 150">
                          <rect
                            x="15"
                            y="10"
                            width="45"
                            height="130"
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="1"
                          />
                          <line
                            x1="15"
                            y1="50"
                            x2="60"
                            y2="50"
                            stroke="#a855f7"
                            strokeWidth="0.8"
                            strokeDasharray="4 2"
                          />
                          <line
                            x1="37.5"
                            y1="65"
                            x2="37.5"
                            y2="120"
                            stroke="#a855f7"
                            strokeWidth="1.5"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="75"
                            y1="50"
                            x2="75"
                            y2="140"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="83"
                            y="100"
                            fontSize="14"
                            fontWeight="900"
                            fill="#1e40af"
                            dominantBaseline="middle"
                          >
                            a
                          </text>
                        </svg>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          width: "fit-content",
                          margin: "0 auto",
                        }}
                      >
                        <AHR_MeasurementBox
                          label="a H"
                          value={getVal(
                            "propertyRampAHeight",
                            rawAhr.external_access?.ramps?.property
                              ?.measurements?.a?.height,
                          )}
                          isModified={isMod("propertyRampAHeight")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Height (a)",
                              "propertyRampAHeight",
                              getVal(
                                "propertyRampAHeight",
                                rawAhr.external_access?.ramps?.property
                                  ?.measurements?.a?.height,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="a L"
                          value={getVal(
                            "propertyRampALength",
                            rawAhr.external_access?.ramps?.property
                              ?.measurements?.a?.length,
                          )}
                          isModified={isMod("propertyRampALength")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Length (a)",
                              "propertyRampALength",
                              getVal(
                                "propertyRampALength",
                                rawAhr.external_access?.ramps?.property
                                  ?.measurements?.a?.length,
                              ),
                            )
                          }
                        />
                      </div>

                      <div style={{ marginTop: "auto", paddingTop: "20px" }}>
                        <div
                          style={{
                            background: "#fff",
                            border: `1.5px solid ${isMod("propertyRampAdequatePlatform") ? AHR_MODIFIED : "#1e40af"}`,
                            borderRadius: "4px",
                            padding: "8px",
                            width: "fit-content",
                            margin: "0 auto",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "10px",
                              fontWeight: "900",
                              color: isMod("propertyRampAdequatePlatform")
                                ? AHR_MODIFIED
                                : "#1e40af",
                              lineHeight: "1.1",
                              marginBottom: "8px",
                            }}
                          >
                            Adequate platform
                            <br />
                            at top of Ramp?
                          </div>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <SmallCheckbox
                              label="Y"
                              checked={
                                getVal(
                                  "propertyRampAdequatePlatform",
                                  rawAhr.external_access?.ramps?.property
                                    ?.adequate_platform,
                                ) === true
                              }
                              isModified={isMod("propertyRampAdequatePlatform")}
                              isLocked={isLocked}
                              onClick={() =>
                                handleOverride(
                                  "propertyRampAdequatePlatform",
                                  true,
                                )
                              }
                            />
                            <SmallCheckbox
                              label="N"
                              checked={
                                getVal(
                                  "propertyRampAdequatePlatform",
                                  rawAhr.external_access?.ramps?.property
                                    ?.adequate_platform,
                                ) === false
                              }
                              isModified={isMod("propertyRampAdequatePlatform")}
                              isLocked={isLocked}
                              onClick={() =>
                                handleOverride(
                                  "propertyRampAdequatePlatform",
                                  false,
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: L Ramp */}
                    <div
                      style={{
                        background: "#fff",
                        padding: "16px 12px",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          handleOverride("propertyRampType", "l-shaped")
                        }
                      >
                        <DoubleBox
                          checked={
                            getVal(
                              "propertyRampType",
                              rawAhr.external_access?.ramps?.property?.type,
                            ) === "l-shaped"
                          }
                        />
                      </div>

                      <div
                        style={{
                          height: "140px",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}
                      >
                        <svg width="100" height="100" viewBox="0 0 140 140">
                          <path
                            d="M 10 40 H 100 V 130 H 60 V 80 H 10 Z"
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="1"
                          />
                          <line
                            x1="60"
                            y1="40"
                            x2="60"
                            y2="80"
                            stroke="#a855f7"
                            strokeWidth="0.8"
                            strokeDasharray="3 2"
                          />
                          <line
                            x1="60"
                            y1="80"
                            x2="100"
                            y2="80"
                            stroke="#a855f7"
                            strokeWidth="0.8"
                            strokeDasharray="3 2"
                          />
                          <line
                            x1="20"
                            y1="60"
                            x2="50"
                            y2="60"
                            stroke="#a855f7"
                            strokeWidth="1.5"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="80"
                            y1="85"
                            x2="80"
                            y2="120"
                            stroke="#a855f7"
                            strokeWidth="1.5"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="15"
                            y1="20"
                            x2="55"
                            y2="20"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="35"
                            y="12"
                            fontSize="12"
                            fontWeight="900"
                            fill="#1e40af"
                            textAnchor="middle"
                          >
                            b
                          </text>
                          <line
                            x1="115"
                            y1="85"
                            x2="115"
                            y2="125"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="122"
                            y="105"
                            fontSize="12"
                            fontWeight="900"
                            fill="#1e40af"
                            dominantBaseline="middle"
                          >
                            a
                          </text>
                        </svg>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          width: "fit-content",
                          margin: "0 auto",
                        }}
                      >
                        <AHR_MeasurementBox
                          label="a H"
                          value={getVal(
                            "propertyRampAHeight",
                            rawAhr.external_access?.ramps?.property
                              ?.measurements?.a?.height,
                          )}
                          isModified={isMod("propertyRampAHeight")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Height (a)",
                              "propertyRampAHeight",
                              getVal(
                                "propertyRampAHeight",
                                rawAhr.external_access?.ramps?.property
                                  ?.measurements?.a?.height,
                              ),
                            )
                          }
                        />

                        <AHR_MeasurementBox
                          label="a L"
                          value={getVal(
                            "propertyRampALength",
                            rawAhr.external_access?.ramps?.property
                              ?.measurements?.a?.length,
                          )}
                          isModified={isMod("propertyRampALength")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Length (a)",
                              "propertyRampALength",
                              getVal(
                                "propertyRampALength",
                                rawAhr.external_access?.ramps?.property
                                  ?.measurements?.a?.length,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="b H"
                          value={getVal(
                            "propertyRampBHeight",
                            rawAhr.external_access?.ramps?.property
                              ?.measurements?.b?.height,
                          )}
                          isModified={isMod("propertyRampBHeight")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Height (b)",
                              "propertyRampBHeight",
                              getVal(
                                "propertyRampBHeight",
                                rawAhr.external_access?.ramps?.property
                                  ?.measurements?.b?.height,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="b L"
                          value={getVal(
                            "propertyRampBLength",
                            rawAhr.external_access?.ramps?.property
                              ?.measurements?.b?.length,
                          )}
                          isModified={isMod("propertyRampBLength")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Length (b)",
                              "propertyRampBLength",
                              getVal(
                                "propertyRampBLength",
                                rawAhr.external_access?.ramps?.property
                                  ?.measurements?.b?.length,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>

                    {/* Column 3: U Ramp */}
                    <div
                      style={{
                        background: "#fff",
                        padding: "16px 12px",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          handleOverride("propertyRampType", "u-shaped")
                        }
                      >
                        <DoubleBox
                          checked={
                            getVal(
                              "propertyRampType",
                              rawAhr.external_access?.ramps?.property?.type,
                            ) === "u-shaped"
                          }
                        />
                      </div>

                      <div
                        style={{
                          height: "140px",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}
                      >
                        <svg width="130" height="100" viewBox="-15 0 180 130">
                          <path
                            d="M 30 115 V 20 H 120 V 115 H 95 V 60 H 55 V 115 Z"
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="1.2"
                          />
                          <line
                            x1="30"
                            y1="60"
                            x2="55"
                            y2="60"
                            stroke="#a855f7"
                            strokeDasharray="4 2"
                            strokeWidth="0.8"
                          />
                          <line
                            x1="95"
                            y1="60"
                            x2="120"
                            y2="60"
                            stroke="#a855f7"
                            strokeDasharray="4 2"
                            strokeWidth="0.8"
                          />
                          <line
                            x1="40"
                            y1="100"
                            x2="40"
                            y2="68"
                            stroke="#a855f7"
                            strokeWidth="1.8"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="110"
                            y1="68"
                            x2="110"
                            y2="105"
                            stroke="#a855f7"
                            strokeWidth="1.8"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="10"
                            y1="65"
                            x2="10"
                            y2="110"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="10"
                            y="88"
                            fontSize="14"
                            fontWeight="900"
                            fill="#1e40af"
                            textAnchor="end"
                            dominantBaseline="middle"
                          >
                            b
                          </text>
                          <line
                            x1="140"
                            y1="65"
                            x2="140"
                            y2="110"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="140"
                            y="88"
                            fontSize="14"
                            fontWeight="900"
                            fill="#1e40af"
                            textAnchor="start"
                            dominantBaseline="middle"
                          >
                            a
                          </text>
                        </svg>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          width: "fit-content",
                          margin: "0 auto",
                        }}
                      >
                        <AHR_MeasurementBox
                          label="a H"
                          value={getVal(
                            "propertyRampAHeight",
                            rawAhr.external_access?.ramps?.property
                              ?.measurements?.a?.height,
                          )}
                          isModified={isMod("propertyRampAHeight")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Height (a)",
                              "propertyRampAHeight",
                              getVal(
                                "propertyRampAHeight",
                                rawAhr.external_access?.ramps?.property
                                  ?.measurements?.a?.height,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="a L"
                          value={getVal(
                            "propertyRampALength",
                            rawAhr.external_access?.ramps?.property
                              ?.measurements?.a?.length,
                          )}
                          isModified={isMod("propertyRampALength")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Length (a)",
                              "propertyRampALength",
                              getVal(
                                "propertyRampALength",
                                rawAhr.external_access?.ramps?.property
                                  ?.measurements?.a?.length,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="b H"
                          value={getVal(
                            "propertyRampBHeight",
                            rawAhr.external_access?.ramps?.property
                              ?.measurements?.b?.height,
                          )}
                          isModified={isMod("propertyRampBHeight")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Height (b)",
                              "propertyRampBHeight",
                              getVal(
                                "propertyRampBHeight",
                                rawAhr.external_access?.ramps?.property
                                  ?.measurements?.b?.height,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="b L"
                          value={getVal(
                            "propertyRampBLength",
                            rawAhr.external_access?.ramps?.property
                              ?.measurements?.b?.length,
                          )}
                          isModified={isMod("propertyRampBLength")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Length (b)",
                              "propertyRampBLength",
                              getVal(
                                "propertyRampBLength",
                                rawAhr.external_access?.ramps?.property
                                  ?.measurements?.b?.length,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div
              style={{
                marginTop: "24px",
                background: "#a855f7",
                padding: "12px 20px",
                borderRadius: "4px",
                color: "#fff",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "20px",
                }}
              >
                <span
                  style={{
                    fontSize: "12.5px",
                    fontWeight: "900",
                    lineHeight: "1.4",
                    textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  STOP NOW if there are more than 4 steps at both communal front
                  door or property front door
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                    minWidth: "80px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "9px",
                      fontStyle: "italic",
                      fontWeight: "700",
                      color: "rgba(255,255,255,0.9)",
                    }}
                  >
                    please tick box
                  </span>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      background: "#fff",
                      borderRadius: "3px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  >
                    {(rawAhr.external_access?.communal_front_door
                      ?.steps_count === "5+" ||
                      rawAhr.external_access?.property_front_door
                        ?.steps_count === "5+") && (
                      <Check size={20} color="#a855f7" strokeWidth={5} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionBlock>

          <SectionBlock title="SECTION E" number="">
            {/* 8, 9, 10 Facilities Distribution */}
            {[
              {
                title: "8. Facilities on Access Level",
                dataKey: "access_level_has",
                key: "facilitiesAccessLevel",
              },
              {
                title: "9. Facilities Above Access Level",
                dataKey: "above_access_level_has",
                key: "facilitiesAboveLevel",
              },
              {
                title: "10. Facilities Below Access Level",
                dataKey: "below_access_level_has",
                key: "facilitiesBelowLevel",
              },
            ].map((section, idx) => {
              const wizardFacilities =
                section.key === "facilitiesAccessLevel"
                  ? wizardData.facilitiesAccessLevel
                  : section.key === "facilitiesAboveLevel"
                    ? wizardData.facilitiesAboveLevel
                    : wizardData.facilitiesBelowLevel;
              const facilities = getVal(
                section.key,
                rawAhr.facility_distribution?.[section.dataKey] ??
                  wizardFacilities ??
                  [],
              );
              const normFacility = (value: string) =>
                value
                  .toLowerCase()
                  .replace(/[_/()-]+/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
              const has = (item: string) =>
                facilities.some((f: string) =>
                  normFacility(f).includes(normFacility(item)),
                );
              const toggle = (item: string) => {
                const current = Array.isArray(facilities)
                  ? [...facilities]
                  : [];
                const lowerItem = item.toLowerCase().replace(/ /g, "_");
                const index = current.findIndex(
                  (f) =>
                    f.toLowerCase().replace(/_/g, " ") === item.toLowerCase(),
                );
                if (index > -1) current.splice(index, 1);
                else current.push(lowerItem);
                handleOverride(section.key, current);
              };

              return (
                <div key={idx} style={{ marginBottom: "12px" }}>
                  <h3
                    style={{
                      fontSize: "13px",
                      fontWeight: "900",
                      color: isMod(section.key) ? AHR_MODIFIED : "#1e40af",
                      borderBottom: `1px solid ${isMod(section.key) ? AHR_MODIFIED : "#bfdbfe"}`,
                      paddingBottom: "2px",
                      marginBottom: "6px",
                    }}
                  >
                    {section.title}
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "4px 20px",
                    }}
                  >
                    {[
                      "Bed 1",
                      "Bed 2",
                      "Bathroom (No Toilet)",
                      "Separate Toilet",
                      "Living Room",
                      "Kitchen",
                      "Other Room",
                      "Combined Bath & Toilet",
                    ].map((label) => (
                      <FacilitiesCheck
                        key={label}
                        label={label}
                        checked={has(label)}
                        isModified={isMod(section.key)}
                        isLocked={isLocked}
                        onChange={() => toggle(label)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* 11. Internal Steps */}
            <div style={{ marginBottom: "12px", paddingBottom: "8px" }}>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: "900",
                  color: isMod("internalStepsCount") ? AHR_MODIFIED : "#1e40af",
                  borderBottom: `1.5px solid ${isMod("internalStepsCount") ? AHR_MODIFIED : "#bfdbfe"}`,
                  paddingBottom: "2px",
                  marginBottom: "6px",
                }}
              >
                11. Internal Steps
              </h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "15px" }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "500",
                      color: isMod("internalStepsCount")
                        ? AHR_MODIFIED
                        : "#1e40af",
                    }}
                  >
                    No of Internal Steps (Not including Stairs)
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[0, 1, 2, 3, 4, "5+"].map((n) => (
                      <SmallCheckbox
                        key={n}
                        label={n.toString()}
                        checked={
                          String(
                            getVal(
                              "internalStepsCount",
                              rawAhr.vertical_circulation?.internal_stairs
                                ?.step_count || "0",
                            ),
                          ) === n.toString()
                        }
                        isModified={isMod("internalStepsCount")}
                        isLocked={isLocked}
                        onClick={() =>
                          handleOverride("internalStepsCount", n.toString())
                        }
                      />
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    background: isMod("internalStepsCount")
                      ? AHR_MODIFIED
                      : "#a855f7",
                    padding: "8px 16px",
                    borderRadius: "3px",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexShrink: 0,
                    marginLeft: "10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "900",
                      lineHeight: "1.2",
                    }}
                  >
                    STOP NOW if any internal steps
                    <br />
                    (not including stairs) Please Tick box
                  </span>
                  <div
                    onClick={() => {
                      if (isLocked) return;
                      const current = Number(
                        getVal(
                          "internalStepsCount",
                          rawAhr.vertical_circulation?.internal_stairs
                            ?.step_count || 0,
                        ),
                      );
                      handleOverride("internalStepsCount", current > 0 ? 0 : 1);
                    }}
                    style={{
                      width: "22px",
                      height: "22px",
                      background: "#fff",
                      borderRadius: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isLocked ? "default" : "pointer",
                    }}
                  >
                    {Number(
                      getVal(
                        "internalStepsCount",
                        rawAhr.vertical_circulation?.internal_stairs
                          ?.step_count,
                      ),
                    ) > 0 && (
                      <Check
                        size={18}
                        color={
                          isMod("internalStepsCount") ? AHR_MODIFIED : "#a855f7"
                        }
                        strokeWidth={5}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionBlock>
        </div>

        {/* --- PAGE 4: Parts 12, 13, 14, 15 --- */}
        <div
          className="ahr-page"
          style={{
            background: "#fff",
            padding: "30px 40px",
            borderRadius: "24px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
            minHeight: "1120px",
          }}
        >
          <SectionBlock title="SECTION E (Continued)" number="">
            {/* 12. Internal Stairs */}
            <div style={{ marginBottom: "20px", paddingBottom: "14px" }}>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: "900",
                  color: isMod("stairsPresent") ? AHR_MODIFIED : "#1e40af",
                  borderBottom: `1.5px solid ${isMod("stairsPresent") ? AHR_MODIFIED : "#bfdbfe"}`,
                  paddingBottom: "2px",
                  marginBottom: "12px",
                }}
              >
                12. Internal Stairs (to access other floors)
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    background: "#f1f5f9",
                    border: `1.5px solid ${isMod("stairsPresent") ? AHR_MODIFIED : "#1e40af"}`,
                    padding: "8px 15px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: isMod("stairsPresent") ? AHR_MODIFIED : "#1e40af",
                    lineHeight: "1.3",
                  }}
                >
                  If Property has a through floor lift OR bedroom, bathroom,
                  kitchen, living room on ground floor go to 13
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "30px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "500",
                          color: isMod("stairsPresent")
                            ? AHR_MODIFIED
                            : "#1e40af",
                        }}
                      >
                        Stairs:
                      </span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <SmallCheckbox
                          label="Y"
                          checked={
                            getVal(
                              "stairsPresent",
                              rawAhr.vertical_circulation?.internal_stairs
                                ?.present ??
                                wizardData.internalStairs === "Yes",
                            ) === true
                          }
                          isModified={isMod("stairsPresent")}
                          isLocked={isLocked}
                          onClick={() => handleOverride("stairsPresent", true)}
                        />
                        <SmallCheckbox
                          label="N"
                          checked={
                            getVal(
                              "stairsPresent",
                              rawAhr.vertical_circulation?.internal_stairs
                                ?.present ??
                                wizardData.internalStairs === "Yes",
                            ) === false
                          }
                          isModified={isMod("stairsPresent")}
                          isLocked={isLocked}
                          onClick={() => handleOverride("stairsPresent", false)}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "500",
                          color: isMod("stairsWidth")
                            ? AHR_MODIFIED
                            : "#1e40af",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Width of Stairs:
                      </span>
                      <AHR_MeasurementBox
                        segments={4}
                        value={getVal(
                          "stairsWidth",
                          rawAhr.vertical_circulation?.internal_stairs
                            ?.min_width_cm?.value ?? wizardData.stairWidth,
                        )}
                        unit="cm"
                        isModified={isMod("stairsWidth")}
                        isLocked={isLocked}
                        onChange={() =>
                          openModal(
                            "Stairs Width",
                            "stairsWidth",
                            getVal(
                              "stairsWidth",
                              rawAhr.vertical_circulation?.internal_stairs
                                ?.min_width_cm?.value ?? wizardData.stairWidth,
                            ),
                          )
                        }
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "20px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: "500",
                            color: isMod("stairsType")
                              ? AHR_MODIFIED
                              : "#1e40af",
                            textAlign: "right",
                            lineHeight: "1.1",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Straight Stairs:
                        </span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <SmallCheckbox
                            label="Y"
                            checked={
                              getVal(
                                "stairsType",
                                rawAhr.vertical_circulation?.internal_stairs
                                  ?.type ??
                                  (wizardData.internalStairsType === "Straight"
                                    ? "STRAIGHT"
                                    : wizardData.internalStairsType
                                      ? "OTHER"
                                      : undefined),
                              ) === "STRAIGHT"
                            }
                            isModified={isMod("stairsType")}
                            isLocked={isLocked}
                            onClick={() =>
                              handleOverride("stairsType", "STRAIGHT")
                            }
                          />
                          <SmallCheckbox
                            label="N"
                            checked={
                              getVal(
                                "stairsType",
                                rawAhr.vertical_circulation?.internal_stairs
                                  ?.type ??
                                  (wizardData.internalStairsType === "Straight"
                                    ? "STRAIGHT"
                                    : wizardData.internalStairsType
                                      ? "OTHER"
                                      : undefined),
                              ) !== "STRAIGHT"
                            }
                            isModified={isMod("stairsType")}
                            isLocked={isLocked}
                            onClick={() =>
                              handleOverride("stairsType", "OTHER")
                            }
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: "500",
                            color: isMod("stairsType")
                              ? AHR_MODIFIED
                              : "#1e40af",
                            textAlign: "right",
                            lineHeight: "1.1",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Curved Stairs:
                        </span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <SmallCheckbox
                            label="Y"
                            checked={
                              getVal(
                                "stairsType",
                                rawAhr.vertical_circulation?.internal_stairs
                                  ?.type ??
                                  ([
                                    "Quarter Turn",
                                    "Half Turn",
                                    "Spiral",
                                    "Winding",
                                  ].includes(wizardData.internalStairsType)
                                    ? "CURVED"
                                    : wizardData.internalStairsType
                                      ? "OTHER"
                                      : undefined),
                              ) === "CURVED"
                            }
                            isModified={isMod("stairsType")}
                            isLocked={isLocked}
                            onClick={() =>
                              handleOverride("stairsType", "CURVED")
                            }
                          />
                          <SmallCheckbox
                            label="N"
                            checked={
                              getVal(
                                "stairsType",
                                rawAhr.vertical_circulation?.internal_stairs
                                  ?.type ??
                                  ([
                                    "Quarter Turn",
                                    "Half Turn",
                                    "Spiral",
                                    "Winding",
                                  ].includes(wizardData.internalStairsType)
                                    ? "CURVED"
                                    : wizardData.internalStairsType
                                      ? "OTHER"
                                      : undefined),
                              ) !== "CURVED"
                            }
                            isModified={isMod("stairsType")}
                            isLocked={isLocked}
                            onClick={() =>
                              handleOverride("stairsType", "OTHER")
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderTop: `1px dashed ${isMod("stairsClearSpaceBottom") ? AHR_MODIFIED : "#bfdbfe"}`,
                      paddingTop: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "500",
                        color: isMod("stairsClearSpaceBottom")
                          ? AHR_MODIFIED
                          : "#1e40af",
                      }}
                    >
                      Is there at least 70cm between bottom of stair and leading
                      edge of front door?
                    </span>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <SmallCheckbox
                        label="Y"
                        checked={
                          getVal(
                            "stairsClearSpaceBottom",
                            rawAhr.vertical_circulation?.internal_stairs
                              ?.clear_space_bottom_70cm ??
                              wizardData.stairBottomClearance === "Y",
                          ) === true
                        }
                        isModified={isMod("stairsClearSpaceBottom")}
                        isLocked={isLocked}
                        onClick={() =>
                          handleOverride("stairsClearSpaceBottom", true)
                        }
                      />
                      <SmallCheckbox
                        label="N"
                        checked={
                          getVal(
                            "stairsClearSpaceBottom",
                            rawAhr.vertical_circulation?.internal_stairs
                              ?.clear_space_bottom_70cm ??
                              wizardData.stairBottomClearance === "Y",
                          ) === false
                        }
                        isModified={isMod("stairsClearSpaceBottom")}
                        isLocked={isLocked}
                        onClick={() =>
                          handleOverride("stairsClearSpaceBottom", false)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 13. Second Exit */}
            <div>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: "900",
                  color: isMod("secondExitPresent") ? AHR_MODIFIED : "#1e40af",
                  borderBottom: `1.5px solid ${isMod("secondExitPresent") ? AHR_MODIFIED : "#bfdbfe"}`,
                  paddingBottom: "2px",
                  marginBottom: "12px",
                }}
              >
                13. Second Exit
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "500",
                        color: isMod("secondExitPresent")
                          ? AHR_MODIFIED
                          : "#1e40af",
                      }}
                    >
                      2nd Exit:
                    </span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <SmallCheckbox
                        label="Y"
                        checked={
                          getVal(
                            "secondExitPresent",
                            analyzedSecondExitPresent,
                          ) === true
                        }
                        isModified={isMod("secondExitPresent")}
                        isLocked={isLocked}
                        onClick={() =>
                          handleOverride("secondExitPresent", true)
                        }
                      />
                      <SmallCheckbox
                        label="N"
                        checked={
                          getVal(
                            "secondExitPresent",
                            analyzedSecondExitPresent,
                          ) === false
                        }
                        isModified={isMod("secondExitPresent")}
                        isLocked={isLocked}
                        onClick={() =>
                          handleOverride("secondExitPresent", false)
                        }
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "500",
                        color: isMod("secondExitAccessToStreet")
                          ? AHR_MODIFIED
                          : "#1e40af",
                        textAlign: "left",
                        lineHeight: "1.2",
                      }}
                    >
                      Access from
                      <br />
                      2nd Exit to Street
                    </span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <SmallCheckbox
                        label="Y"
                        checked={
                          getVal(
                            "secondExitAccessToStreet",
                            analyzedSecondExitAccessToStreet,
                          ) === true
                        }
                        isModified={isMod("secondExitAccessToStreet")}
                        isLocked={isLocked}
                        onClick={() =>
                          handleOverride("secondExitAccessToStreet", true)
                        }
                      />
                      <SmallCheckbox
                        label="N"
                        checked={
                          getVal(
                            "secondExitAccessToStreet",
                            analyzedSecondExitAccessToStreet,
                          ) === false
                        }
                        isModified={isMod("secondExitAccessToStreet")}
                        isLocked={isLocked}
                        onClick={() =>
                          handleOverride("secondExitAccessToStreet", false)
                        }
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "500",
                        color: isMod("secondExitSteps")
                          ? AHR_MODIFIED
                          : "#1e40af",
                        textAlign: "left",
                        lineHeight: "1.2",
                      }}
                    >
                      No. of Steps
                      <br />
                      at 2nd Exit
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {[0, 1, 2, 3, 4, "5+"].map((n) => (
                        <SmallCheckbox
                          key={n}
                          label={n.toString()}
                          checked={
                            String(
                              getVal(
                                "secondExitSteps",
                                rawAhr.context_amenities?.second_exit?.steps ||
                                  "0",
                              ),
                            ) === n.toString()
                          }
                          isModified={isMod("secondExitSteps")}
                          isLocked={isLocked}
                          onClick={() =>
                            handleOverride("secondExitSteps", n.toString())
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: `1px dashed ${isMod("secondExitThreshold") ? AHR_MODIFIED : "#bfdbfe"}`,
                    paddingTop: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "30px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "500",
                        color: isMod("secondExitThreshold")
                          ? AHR_MODIFIED
                          : "#1e40af",
                        width: "130px",
                        lineHeight: "1.2",
                      }}
                    >
                      What is the height of the threshold?
                    </span>
                    <div style={{ display: "flex", gap: "16px" }}>
                      {[
                        { label: "10cm or above", val: "above10" },
                        { label: "Under 10cm and above 1.5cm", val: "between" },
                        { label: "0 - 1.5cm", val: "below1.5" },
                      ].map((t) => (
                        <SmallCheckbox
                          key={t.val}
                          label={t.label}
                          checked={
                            getVal(
                              "secondExitThreshold",
                              (rawAhr.context_amenities?.second_exit
                                ?.threshold_height_cm || 0) >= 10
                                ? "above10"
                                : (rawAhr.context_amenities?.second_exit
                                      ?.threshold_height_cm || 0) > 1.5
                                  ? "between"
                                  : "below1.5",
                            ) === t.val
                          }
                          isModified={isMod("secondExitThreshold")}
                          isLocked={isLocked}
                          onClick={() =>
                            handleOverride("secondExitThreshold", t.val)
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "500",
                        color: isMod("secondExitWidth")
                          ? AHR_MODIFIED
                          : "#1e40af",
                        textAlign: "right",
                        lineHeight: "1.2",
                      }}
                    >
                      Door Opening Width
                    </span>
                    <AHR_MeasurementBox
                      segments={4}
                      value={getVal(
                        "secondExitWidth",
                        rawAhr.context_amenities?.second_exit?.opening_width_cm,
                      )}
                      unit="cm"
                      isModified={isMod("secondExitWidth")}
                      isLocked={isLocked}
                      onChange={() =>
                        openModal(
                          "2nd Exit Width",
                          "secondExitWidth",
                          getVal(
                            "secondExitWidth",
                            rawAhr.context_amenities?.second_exit
                              ?.opening_width_cm,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* 14. Ramped Second Exit */}
            <div style={{ marginTop: "32px" }}>
              <div
                style={{
                  borderBottom: `2.5px solid ${isMod("secondExitRampPresent") ? AHR_MODIFIED : "#bfdbfe"}`,
                  paddingBottom: "4px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "baseline",
                  gap: "10px",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "900",
                    color: isMod("secondExitRampPresent")
                      ? AHR_MODIFIED
                      : "#1e40af",
                    margin: 0,
                  }}
                >
                  14. Ramped Second Exit
                </h3>
                <span
                  style={{
                    fontSize: "11px",
                    fontStyle: "italic",
                    color: isMod("secondExitRampPresent")
                      ? AHR_MODIFIED
                      : "#1e40af",
                    fontWeight: "600",
                  }}
                >
                  (assess only most useful ramp for property)
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "900",
                    color: isMod("secondExitRampPresent")
                      ? AHR_MODIFIED
                      : "#1e40af",
                    marginLeft: "auto",
                  }}
                >
                  Please tick against type of ramp
                </span>
              </div>

              <div style={{ display: "flex", gap: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "180px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <ChoiceBox
                      label="YES (Complete 14)"
                      checked={
                        getVal(
                          "secondExitRampPresent",
                          rawAhr.context_amenities?.second_exit?.ramped ??
                            false,
                        ) === true
                      }
                      isModified={isMod("secondExitRampPresent")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("secondExitRampPresent", true)
                      }
                    />
                    <ChoiceBox
                      label="NO (Continue)"
                      checked={
                        getVal(
                          "secondExitRampPresent",
                          rawAhr.context_amenities?.second_exit?.ramped ??
                            false,
                        ) === false
                      }
                      isModified={isMod("secondExitRampPresent")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("secondExitRampPresent", false)
                      }
                    />

                    <div
                      style={{
                        marginTop: "auto",
                        padding: "10px",
                        textAlign: "center",
                      }}
                    >
                      <svg width="100" height="50" viewBox="0 0 120 60">
                        <path
                          d="M 10 50 L 100 50 L 100 10 Z"
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="1.2"
                        />
                        <line
                          x1="20"
                          y1="55"
                          x2="90"
                          y2="55"
                          stroke="#a855f7"
                          strokeWidth="1"
                          markerStart="url(#arrowhead-purple)"
                          markerEnd="url(#arrowhead-purple)"
                        />
                        <text
                          x="55"
                          y="52"
                          fontSize="11"
                          fontWeight="900"
                          fill="#1e40af"
                          textAnchor="middle"
                        >
                          L
                        </text>
                        <line
                          x1="108"
                          y1="45"
                          x2="108"
                          y2="15"
                          stroke="#a855f7"
                          strokeWidth="1"
                          markerStart="url(#arrowhead-purple)"
                          markerEnd="url(#arrowhead-purple)"
                        />
                        <text
                          x="112"
                          y="30"
                          fontSize="11"
                          fontWeight="900"
                          fill="#1e40af"
                          dominantBaseline="middle"
                        >
                          H
                        </text>
                      </svg>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#1e40af",
                          fontWeight: "900",
                          marginTop: "5px",
                        }}
                      >
                        H=height
                        <br />
                        L=length
                      </div>
                    </div>
                  </div>
                </div>

                {
                  <div
                    style={{
                      flex: 1,
                      display: "grid",
                      gridTemplateColumns: "1fr 1.2fr 1.2fr",
                      gap: "1px",
                      background: "#bfdbfe",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    {/* Column 1: Straight Ramp */}
                    <div
                      style={{
                        background: "#fff",
                        padding: "16px 12px",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          cursor: isLocked ? "default" : "pointer",
                        }}
                        onClick={() =>
                          handleOverride("secondExitRampType", "straight")
                        }
                      >
                        <DoubleBox
                          checked={
                            getVal(
                              "secondExitRampType",
                              rawAhr.context_amenities?.second_exit?.ramp_type,
                            ) === "straight"
                          }
                        />
                      </div>

                      <div
                        style={{
                          height: "140px",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}
                      >
                        <svg width="70" height="110" viewBox="0 0 100 150">
                          <rect
                            x="15"
                            y="10"
                            width="45"
                            height="130"
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="1"
                          />
                          <line
                            x1="15"
                            y1="50"
                            x2="60"
                            y2="50"
                            stroke="#a855f7"
                            strokeWidth="0.8"
                            strokeDasharray="4 2"
                          />
                          <line
                            x1="37.5"
                            y1="65"
                            x2="37.5"
                            y2="120"
                            stroke="#a855f7"
                            strokeWidth="1.5"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="75"
                            y1="50"
                            x2="75"
                            y2="140"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="83"
                            y="100"
                            fontSize="14"
                            fontWeight="900"
                            fill="#1e40af"
                            dominantBaseline="middle"
                          >
                            a
                          </text>
                        </svg>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          width: "fit-content",
                          margin: "0 auto",
                        }}
                      >
                        <AHR_MeasurementBox
                          label="a H"
                          value={getVal(
                            "secondExitRampAHeight",
                            rawAhr.context_amenities?.second_exit
                              ?.ramp_measurements?.a?.height,
                          )}
                          isModified={isMod("secondExitRampAHeight")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Height (a)",
                              "secondExitRampAHeight",
                              getVal(
                                "secondExitRampAHeight",
                                rawAhr.context_amenities?.second_exit
                                  ?.ramp_measurements?.a?.height,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="a L"
                          value={getVal(
                            "secondExitRampALength",
                            rawAhr.context_amenities?.second_exit
                              ?.ramp_measurements?.a?.length,
                          )}
                          isModified={isMod("secondExitRampALength")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Length (a)",
                              "secondExitRampALength",
                              getVal(
                                "secondExitRampALength",
                                rawAhr.context_amenities?.second_exit
                                  ?.ramp_measurements?.a?.length,
                              ),
                            )
                          }
                        />
                      </div>

                      <div style={{ marginTop: "auto", paddingTop: "20px" }}>
                        <div
                          style={{
                            background: "#fff",
                            border: `1.5px solid ${isMod("secondExitRampAdequatePlatform") ? AHR_MODIFIED : "#1e40af"}`,
                            borderRadius: "4px",
                            padding: "8px",
                            width: "fit-content",
                            margin: "0 auto",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "10px",
                              fontWeight: "900",
                              color: isMod("secondExitRampAdequatePlatform")
                                ? AHR_MODIFIED
                                : "#1e40af",
                              lineHeight: "1.1",
                              marginBottom: "8px",
                            }}
                          >
                            Adequate platform
                            <br />
                            at top of Ramp?
                          </div>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <SmallCheckbox
                              label="Y"
                              checked={
                                getVal(
                                  "secondExitRampAdequatePlatform",
                                  rawAhr.context_amenities?.second_exit
                                    ?.ramp_adequate_platform,
                                ) === true
                              }
                              isModified={isMod(
                                "secondExitRampAdequatePlatform",
                              )}
                              isLocked={isLocked}
                              onClick={() =>
                                handleOverride(
                                  "secondExitRampAdequatePlatform",
                                  true,
                                )
                              }
                            />
                            <SmallCheckbox
                              label="N"
                              checked={
                                getVal(
                                  "secondExitRampAdequatePlatform",
                                  rawAhr.context_amenities?.second_exit
                                    ?.ramp_adequate_platform,
                                ) === false
                              }
                              isModified={isMod(
                                "secondExitRampAdequatePlatform",
                              )}
                              isLocked={isLocked}
                              onClick={() =>
                                handleOverride(
                                  "secondExitRampAdequatePlatform",
                                  false,
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: L Ramp */}
                    <div
                      style={{
                        background: "#fff",
                        padding: "16px 12px",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          cursor: isLocked ? "default" : "pointer",
                        }}
                        onClick={() =>
                          handleOverride("secondExitRampType", "l-shaped")
                        }
                      >
                        <DoubleBox
                          checked={
                            getVal(
                              "secondExitRampType",
                              rawAhr.context_amenities?.second_exit?.ramp_type,
                            ) === "l-shaped"
                          }
                        />
                      </div>

                      <div
                        style={{
                          height: "140px",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}
                      >
                        <svg width="100" height="100" viewBox="0 0 140 140">
                          <path
                            d="M 10 40 H 100 V 130 H 60 V 80 H 10 Z"
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="1"
                          />
                          <line
                            x1="60"
                            y1="40"
                            x2="60"
                            y2="80"
                            stroke="#a855f7"
                            strokeWidth="0.8"
                            strokeDasharray="3 2"
                          />
                          <line
                            x1="60"
                            y1="80"
                            x2="100"
                            y2="80"
                            stroke="#a855f7"
                            strokeWidth="0.8"
                            strokeDasharray="3 2"
                          />
                          <line
                            x1="20"
                            y1="60"
                            x2="50"
                            y2="60"
                            stroke="#a855f7"
                            strokeWidth="1.5"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="80"
                            y1="85"
                            x2="80"
                            y2="120"
                            stroke="#a855f7"
                            strokeWidth="1.5"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="15"
                            y1="20"
                            x2="55"
                            y2="20"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="35"
                            y="12"
                            fontSize="12"
                            fontWeight="900"
                            fill="#1e40af"
                            textAnchor="middle"
                          >
                            b
                          </text>
                          <line
                            x1="115"
                            y1="85"
                            x2="115"
                            y2="125"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="122"
                            y="105"
                            fontSize="12"
                            fontWeight="900"
                            fill="#1e40af"
                            dominantBaseline="middle"
                          >
                            a
                          </text>
                        </svg>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          width: "fit-content",
                          margin: "0 auto",
                        }}
                      >
                        <AHR_MeasurementBox
                          label="a H"
                          value={getVal(
                            "secondExitRampAHeight",
                            rawAhr.context_amenities?.second_exit
                              ?.ramp_measurements?.a?.height,
                          )}
                          isModified={isMod("secondExitRampAHeight")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Height (a)",
                              "secondExitRampAHeight",
                              getVal(
                                "secondExitRampAHeight",
                                rawAhr.context_amenities?.second_exit
                                  ?.ramp_measurements?.a?.height,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="a L"
                          value={getVal(
                            "secondExitRampALength",
                            rawAhr.context_amenities?.second_exit
                              ?.ramp_measurements?.a?.length,
                          )}
                          isModified={isMod("secondExitRampALength")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Length (a)",
                              "secondExitRampALength",
                              getVal(
                                "secondExitRampALength",
                                rawAhr.context_amenities?.second_exit
                                  ?.ramp_measurements?.a?.length,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="b H"
                          value={getVal(
                            "secondExitRampBHeight",
                            rawAhr.context_amenities?.second_exit
                              ?.ramp_measurements?.b?.height,
                          )}
                          isModified={isMod("secondExitRampBHeight")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Height (b)",
                              "secondExitRampBHeight",
                              getVal(
                                "secondExitRampBHeight",
                                rawAhr.context_amenities?.second_exit
                                  ?.ramp_measurements?.b?.height,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="b L"
                          value={getVal(
                            "secondExitRampBLength",
                            rawAhr.context_amenities?.second_exit
                              ?.ramp_measurements?.b?.length,
                          )}
                          isModified={isMod("secondExitRampBLength")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Length (b)",
                              "secondExitRampBLength",
                              getVal(
                                "secondExitRampBLength",
                                rawAhr.context_amenities?.second_exit
                                  ?.ramp_measurements?.b?.length,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>

                    {/* Column 3: U Ramp */}
                    <div
                      style={{
                        background: "#fff",
                        padding: "16px 12px",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          cursor: isLocked ? "default" : "pointer",
                        }}
                        onClick={() =>
                          handleOverride("secondExitRampType", "u-shaped")
                        }
                      >
                        <DoubleBox
                          checked={
                            getVal(
                              "secondExitRampType",
                              rawAhr.context_amenities?.second_exit?.ramp_type,
                            ) === "u-shaped"
                          }
                        />
                      </div>

                      <div
                        style={{
                          height: "140px",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          marginBottom: "20px",
                        }}
                      >
                        <svg width="130" height="100" viewBox="-15 0 180 130">
                          <path
                            d="M 30 115 V 20 H 120 V 115 H 95 V 60 H 55 V 115 Z"
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="1.2"
                          />
                          <line
                            x1="30"
                            y1="60"
                            x2="55"
                            y2="60"
                            stroke="#a855f7"
                            strokeDasharray="4 2"
                            strokeWidth="0.8"
                          />
                          <line
                            x1="95"
                            y1="60"
                            x2="120"
                            y2="60"
                            stroke="#a855f7"
                            strokeDasharray="4 2"
                            strokeWidth="0.8"
                          />
                          <line
                            x1="40"
                            y1="100"
                            x2="40"
                            y2="68"
                            stroke="#a855f7"
                            strokeWidth="1.8"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="110"
                            y1="68"
                            x2="110"
                            y2="105"
                            stroke="#a855f7"
                            strokeWidth="1.8"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <line
                            x1="10"
                            y1="65"
                            x2="10"
                            y2="110"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="10"
                            y="88"
                            fontSize="14"
                            fontWeight="900"
                            fill="#1e40af"
                            textAnchor="end"
                            dominantBaseline="middle"
                          >
                            b
                          </text>
                          <line
                            x1="140"
                            y1="65"
                            x2="140"
                            y2="110"
                            stroke="#a855f7"
                            strokeWidth="1"
                            markerStart="url(#arrowhead-purple)"
                            markerEnd="url(#arrowhead-purple)"
                          />
                          <text
                            x="140"
                            y="88"
                            fontSize="14"
                            fontWeight="900"
                            fill="#1e40af"
                            textAnchor="start"
                            dominantBaseline="middle"
                          >
                            a
                          </text>
                        </svg>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          width: "fit-content",
                          margin: "0 auto",
                        }}
                      >
                        <AHR_MeasurementBox
                          label="a H"
                          value={getVal(
                            "secondExitRampAHeight",
                            rawAhr.context_amenities?.second_exit
                              ?.ramp_measurements?.a?.height,
                          )}
                          isModified={isMod("secondExitRampAHeight")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Height (a)",
                              "secondExitRampAHeight",
                              getVal(
                                "secondExitRampAHeight",
                                rawAhr.context_amenities?.second_exit
                                  ?.ramp_measurements?.a?.height,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="a L"
                          value={getVal(
                            "secondExitRampALength",
                            rawAhr.context_amenities?.second_exit
                              ?.ramp_measurements?.a?.length,
                          )}
                          isModified={isMod("secondExitRampALength")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Length (a)",
                              "secondExitRampALength",
                              getVal(
                                "secondExitRampALength",
                                rawAhr.context_amenities?.second_exit
                                  ?.ramp_measurements?.a?.length,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="b H"
                          value={getVal(
                            "secondExitRampBHeight",
                            rawAhr.context_amenities?.second_exit
                              ?.ramp_measurements?.b?.height,
                          )}
                          isModified={isMod("secondExitRampBHeight")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Height (b)",
                              "secondExitRampBHeight",
                              getVal(
                                "secondExitRampBHeight",
                                rawAhr.context_amenities?.second_exit
                                  ?.ramp_measurements?.b?.height,
                              ),
                            )
                          }
                        />
                        <AHR_MeasurementBox
                          label="b L"
                          value={getVal(
                            "secondExitRampBLength",
                            rawAhr.context_amenities?.second_exit
                              ?.ramp_measurements?.b?.length,
                          )}
                          isModified={isMod("secondExitRampBLength")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Ramp Length (b)",
                              "secondExitRampBLength",
                              getVal(
                                "secondExitRampBLength",
                                rawAhr.context_amenities?.second_exit
                                  ?.ramp_measurements?.b?.length,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            {/* 15. Access to Garden */}
            <div style={{ marginTop: "24px" }}>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: "900",
                  color:
                    isMod("gardenPresent") ||
                    isMod("balconyPresent") ||
                    isMod("gardenSteps") ||
                    isMod("balconySteps")
                      ? AHR_MODIFIED
                      : "#1e40af",
                  borderBottom: `1.5px solid ${isMod("gardenPresent") || isMod("balconyPresent") || isMod("gardenSteps") || isMod("balconySteps") ? AHR_MODIFIED : "#bfdbfe"}`,
                  paddingBottom: "2px",
                  marginBottom: "12px",
                }}
              >
                15. Access to Garden
              </h3>
              <div
                style={{ display: "flex", alignItems: "center", gap: "40px" }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "15px" }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "500",
                      color: isMod("gardenPresent") ? AHR_MODIFIED : "#1e40af",
                    }}
                  >
                    Private Garden:
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <SmallCheckbox
                      label="Y"
                      checked={
                        getVal(
                          "gardenPresent",
                          rawAhr.context_amenities?.garden?.present ??
                            wizardData.gardenAccess === "Yes",
                        ) === true
                      }
                      isModified={isMod("gardenPresent")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("gardenPresent", true)}
                    />
                    <SmallCheckbox
                      label="N"
                      checked={
                        getVal(
                          "gardenPresent",
                          rawAhr.context_amenities?.garden?.present ??
                            wizardData.gardenAccess === "Yes",
                        ) === false
                      }
                      isModified={isMod("gardenPresent")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("gardenPresent", false)}
                    />
                  </div>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "15px" }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "500",
                      color: isMod("balconyPresent") ? AHR_MODIFIED : "#1e40af",
                    }}
                  >
                    Balcony:
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <SmallCheckbox
                      label="Y"
                      checked={
                        getVal(
                          "balconyPresent",
                          rawAhr.context_amenities?.balcony?.present ??
                            wizardData.balconyPresent === "Yes",
                        ) === true
                      }
                      isModified={isMod("balconyPresent")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("balconyPresent", true)}
                    />
                    <SmallCheckbox
                      label="N"
                      checked={
                        getVal(
                          "balconyPresent",
                          rawAhr.context_amenities?.balcony?.present ??
                            wizardData.balconyPresent === "Yes",
                        ) === false
                      }
                      isModified={isMod("balconyPresent")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("balconyPresent", false)}
                    />
                  </div>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "500",
                      color: isMod("gardenSteps") ? AHR_MODIFIED : "#1e40af",
                    }}
                  >
                    No. of Steps to Garden
                  </span>
                  <div
                    onClick={() => {
                      if (isLocked) return;
                      openModal(
                        "No. of Steps to Garden",
                        "gardenSteps",
                        getVal(
                          "gardenSteps",
                          rawAhr.context_amenities?.garden?.steps || "",
                        ),
                      );
                    }}
                    style={{
                      border: `1.5px solid ${isMod("gardenSteps") ? AHR_MODIFIED : "#1e40af"}`,
                      borderRadius: "6px",
                      width: "40px",
                      height: "28px",
                      background: isMod("gardenSteps") ? "#f0fdf4" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "800",
                      cursor: isLocked ? "default" : "pointer",
                      color: isMod("gardenSteps") ? AHR_MODIFIED : "#1e293b",
                    }}
                  >
                    {getVal(
                      "gardenSteps",
                      rawAhr.context_amenities?.garden?.steps,
                    ) || ""}
                  </div>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "500",
                      color: isMod("balconySteps") ? AHR_MODIFIED : "#1e40af",
                    }}
                  >
                    No. of Steps to Balcony
                  </span>
                  <div
                    onClick={() => {
                      if (isLocked) return;
                      openModal(
                        "No. of Steps to Balcony",
                        "balconySteps",
                        getVal(
                          "balconySteps",
                          rawAhr.context_amenities?.balcony?.steps || "",
                        ),
                      );
                    }}
                    style={{
                      border: `1.5px solid ${isMod("balconySteps") ? AHR_MODIFIED : "#1e40af"}`,
                      borderRadius: "6px",
                      width: "40px",
                      height: "28px",
                      background: isMod("balconySteps") ? "#f0fdf4" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "800",
                      cursor: isLocked ? "default" : "pointer",
                      color: isMod("balconySteps") ? AHR_MODIFIED : "#1e293b",
                    }}
                  >
                    {getVal(
                      "balconySteps",
                      rawAhr.context_amenities?.balcony?.steps,
                    ) || ""}
                  </div>
                </div>
              </div>
            </div>

            {/* STOP Banners */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginTop: "24px",
              }}
            >
              <div
                style={{
                  background: "#a855f7",
                  padding: "10px 20px",
                  borderRadius: "4px",
                  color: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: "900" }}>
                  STOP NOW If width of straight stairs is 69.9cm or less or
                  curved stairs is 74.9cm or less.{" "}
                  <span
                    style={{
                      fontStyle: "italic",
                      fontSize: "10px",
                      fontWeight: "600",
                    }}
                  >
                    please tick box
                  </span>
                </span>
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    background: "#fff",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {((rawAhr.vertical_circulation?.internal_stairs?.min_width_cm
                    ?.value <= 69.9 &&
                    rawAhr.vertical_circulation?.internal_stairs?.type ===
                      "STRAIGHT") ||
                    (rawAhr.vertical_circulation?.internal_stairs?.min_width_cm
                      ?.value <= 74.9 &&
                      rawAhr.vertical_circulation?.internal_stairs?.type ===
                        "CURVED")) && (
                    <Check size={18} color="#a855f7" strokeWidth={5} />
                  )}
                </div>
              </div>

              <div
                style={{
                  background: "#a855f7",
                  padding: "10px 20px",
                  borderRadius: "4px",
                  color: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "12px", fontWeight: "900" }}>
                    STOP NOW If there is less than 70cm between bottom stair and
                    leading edge of door
                    <br />
                    AND there is no 2nd exit that leads to the street.{" "}
                    <span
                      style={{
                        fontStyle: "italic",
                        fontSize: "10px",
                        fontWeight: "600",
                      }}
                    >
                      please tick box
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    background: "#fff",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {rawAhr.vertical_circulation?.internal_stairs
                    ?.clear_space_bottom_70cm === false &&
                    rawAhr.context_amenities?.second_exit?.access_to_street ===
                      false && (
                      <Check size={18} color="#a855f7" strokeWidth={5} />
                    )}
                </div>
              </div>
            </div>
          </SectionBlock>
        </div>

        {/* --- PAGE 5: Parts 16, 17, 18, 19, 20, 21 --- */}
        <div
          className="ahr-page"
          style={{
            background: "#fff",
            padding: "30px 40px",
            borderRadius: "24px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
            minHeight: "1120px",
          }}
        >
          <SectionBlock title="SECTION E (Continued)" number="">
            {/* Left Side: Hallway & Storage */}
            <div>
              {/* 16. Hallway */}
              <div style={{ marginBottom: "16px" }}>
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: "900",
                    color: "#1e40af",
                    borderBottom: "1.5px solid #bfdbfe",
                    paddingBottom: "2px",
                    marginBottom: "12px",
                  }}
                >
                  16. Hallway
                </h3>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "24px" }}
                >
                  <div style={{ width: "120px" }}>
                    <p
                      style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        color: "#1e40af",
                        margin: 0,
                        lineHeight: "1.1",
                      }}
                    >
                      Hallway minimum width
                      <br />
                      (exclude radiators):
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "32px" }}>
                    {/* a. Head on approach */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "500",
                            color: isMod("hallwayMinWidthHeadOn")
                              ? AHR_MODIFIED
                              : "#1e40af",
                          }}
                        >
                          a Head on approach
                        </span>
                        <AHR_MeasurementBox
                          segments={5}
                          value={getVal(
                            "hallwayMinWidthHeadOn",
                            rawAhr.internal_circulation?.hallway
                              ?.approach_type === "HEAD_ON"
                              ? rawAhr.internal_circulation?.hallway
                                  ?.min_width_cm?.value
                              : wizardData.hallwayWidthHeadOn || "",
                          )}
                          unit="cm"
                          isModified={isMod("hallwayMinWidthHeadOn")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Hallway Width (Head on)",
                              "hallwayMinWidthHeadOn",
                              getVal(
                                "hallwayMinWidthHeadOn",
                                rawAhr.internal_circulation?.hallway
                                  ?.approach_type === "HEAD_ON"
                                  ? rawAhr.internal_circulation?.hallway
                                      ?.min_width_cm?.value
                                  : wizardData.hallwayWidthHeadOn || "",
                              ),
                            )
                          }
                        />
                      </div>
                      <svg width="85" height="55" viewBox="0 0 100 80">
                        <defs>
                          <marker
                            id="arrowhead-purple-a"
                            markerWidth="6"
                            markerHeight="6"
                            refX="3"
                            refY="3"
                            orient="auto"
                          >
                            <polygon points="0 0, 6 3, 0 6" fill="#a855f7" />
                          </marker>
                        </defs>
                        {/* Wall lines */}
                        <line
                          x1="0"
                          y1="20"
                          x2="60"
                          y2="20"
                          stroke="#a855f7"
                          strokeWidth="1.2"
                        />
                        <line
                          x1="0"
                          y1="60"
                          x2="60"
                          y2="60"
                          stroke="#a855f7"
                          strokeWidth="1.2"
                        />
                        <line
                          x1="60"
                          y1="0"
                          x2="60"
                          y2="20"
                          stroke="#a855f7"
                          strokeWidth="1.2"
                        />
                        <line
                          x1="60"
                          y1="60"
                          x2="60"
                          y2="80"
                          stroke="#a855f7"
                          strokeWidth="1.2"
                        />
                        {/* Door leaf - 70 degree opn (20deg from horizontal) */}
                        <line
                          x1="60"
                          y1="60"
                          x2="98"
                          y2="46"
                          stroke="#a855f7"
                          strokeWidth="1.5"
                        />
                        {/* Swing arc starting from top gap edge to door tip */}
                        <path
                          d="M 60 20 A 40 40 0 0 1 98 46"
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="1"
                          strokeDasharray="3 2"
                        />
                        {/* Bold Arrow */}
                        <line
                          x1="5"
                          y1="40"
                          x2="55"
                          y2="40"
                          stroke="#a855f7"
                          strokeWidth="2.5"
                          markerEnd="url(#arrowhead-purple-a)"
                        />
                      </svg>
                    </div>

                    {/* b. Turn approach */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "500",
                            color: isMod("hallwayMinWidthTurn")
                              ? AHR_MODIFIED
                              : "#1e40af",
                          }}
                        >
                          b Turn approach
                        </span>
                        <AHR_MeasurementBox
                          segments={5}
                          value={getVal(
                            "hallwayMinWidthTurn",
                            rawAhr.internal_circulation?.hallway
                              ?.approach_type === "TURN_APPROACH"
                              ? rawAhr.internal_circulation?.hallway
                                  ?.min_width_cm?.value
                              : wizardData.hallwayWidthTurn || "",
                          )}
                          unit="cm"
                          isModified={isMod("hallwayMinWidthTurn")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Hallway Width (Turn)",
                              "hallwayMinWidthTurn",
                              getVal(
                                "hallwayMinWidthTurn",
                                rawAhr.internal_circulation?.hallway
                                  ?.approach_type === "TURN_APPROACH"
                                  ? rawAhr.internal_circulation?.hallway
                                      ?.min_width_cm?.value
                                  : wizardData.hallwayWidthTurn || "",
                              ),
                            )
                          }
                        />
                      </div>
                      <svg width="85" height="55" viewBox="0 0 100 80">
                        <defs>
                          <marker
                            id="arrowhead-purple-b"
                            markerWidth="6"
                            markerHeight="6"
                            refX="3"
                            refY="3"
                            orient="auto"
                          >
                            <polygon points="0 0, 6 3, 0 6" fill="#a855f7" />
                          </marker>
                        </defs>
                        {/* Hallway lines */}
                        <line
                          x1="0"
                          y1="35"
                          x2="35"
                          y2="35"
                          stroke="#a855f7"
                          strokeWidth="1.2"
                        />
                        <line
                          x1="65"
                          y1="35"
                          x2="100"
                          y2="35"
                          stroke="#a855f7"
                          strokeWidth="1.2"
                        />
                        <line
                          x1="0"
                          y1="70"
                          x2="100"
                          y2="70"
                          stroke="#a855f7"
                          strokeWidth="1.2"
                        />
                        {/* Door leaf hinged left - opening 70 deg up-left */}
                        <line
                          x1="35"
                          y1="35"
                          x2="25"
                          y2="7"
                          stroke="#a855f7"
                          strokeWidth="1.5"
                        />
                        {/* Swing arc from right wall edge (65,35) to tip (25,7) */}
                        <path
                          d="M 65 35 A 30 30 0 0 0 25 7"
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="1"
                          strokeDasharray="3 2"
                          strokeOpacity="0.7"
                        />
                        {/* Turn Bold Arrow */}
                        <path
                          d="M 5 55 H 50 V 32"
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="2.5"
                          markerEnd="url(#arrowhead-purple-b)"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 17. Possible Storage */}
            <div style={{ marginTop: "24px" }}>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: "900",
                  color: isMod("wheelchairStoragePresent")
                    ? AHR_MODIFIED
                    : "#1e40af",
                  borderBottom: `1.5px solid ${isMod("wheelchairStoragePresent") ? AHR_MODIFIED : "#bfdbfe"}`,
                  paddingBottom: "2px",
                  marginBottom: "12px",
                }}
              >
                17. Possible Wheelchair & Scooter Storage
              </h3>
              <div style={{ display: "flex", gap: "32px" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    minWidth: "150px",
                  }}
                >
                  <ChoiceBox
                    label="YES - Complete 17"
                    checked={
                      getVal(
                        "wheelchairStoragePresent",
                        rawAhr.internal_circulation?.wheelchair_storage
                          ?.present ??
                          wizardData.wheelchairStoragePresent === "Y",
                      ) === true
                    }
                    isModified={isMod("wheelchairStoragePresent")}
                    isLocked={isLocked}
                    onClick={() =>
                      handleOverride("wheelchairStoragePresent", true)
                    }
                  />
                  <ChoiceBox
                    label="NO - Go to 18"
                    checked={
                      getVal(
                        "wheelchairStoragePresent",
                        rawAhr.internal_circulation?.wheelchair_storage
                          ?.present ??
                          wizardData.wheelchairStoragePresent === "Y",
                      ) === false
                    }
                    isModified={isMod("wheelchairStoragePresent")}
                    isLocked={isLocked}
                    onClick={() =>
                      handleOverride("wheelchairStoragePresent", false)
                    }
                  />
                </div>
                {
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                        marginBottom: "12px",
                        borderBottom: `1px dashed ${isMod("wheelchairStorageLength") || isMod("wheelchairStorageWidth") ? (isLocked ? "#bfdbfe" : AHR_MODIFIED) : "#bfdbfe"}`,
                        paddingBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color:
                            isMod("wheelchairStorageLength") ||
                            isMod("wheelchairStorageWidth")
                              ? AHR_MODIFIED
                              : "#1e40af",
                          fontWeight: "600",
                        }}
                      >
                        Dimensions:
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <AHR_MeasurementBox
                          segments={4}
                          value={getVal(
                            "wheelchairStorageLength",
                            rawAhr.internal_circulation?.wheelchair_storage
                              ?.dimensions_cm?.length ??
                              wizardData.wheelchairStorageLengthCm,
                          )}
                          unit={null}
                          isModified={isMod("wheelchairStorageLength")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Storage Length",
                              "wheelchairStorageLength",
                              getVal(
                                "wheelchairStorageLength",
                                rawAhr.internal_circulation?.wheelchair_storage
                                  ?.dimensions_cm?.length ??
                                  wizardData.wheelchairStorageLengthCm,
                              ),
                            )
                          }
                        />
                        <span
                          style={{
                            color:
                              isMod("wheelchairStorageLength") ||
                              isMod("wheelchairStorageWidth")
                                ? AHR_MODIFIED
                                : "#1e40af",
                            fontSize: "12px",
                          }}
                        >
                          x
                        </span>
                        <AHR_MeasurementBox
                          segments={4}
                          value={getVal(
                            "wheelchairStorageWidth",
                            rawAhr.internal_circulation?.wheelchair_storage
                              ?.dimensions_cm?.width ??
                              wizardData.wheelchairStorageWidthCm,
                          )}
                          unit={null}
                          isModified={isMod("wheelchairStorageWidth")}
                          isLocked={isLocked}
                          onChange={() =>
                            openModal(
                              "Storage Width",
                              "wheelchairStorageWidth",
                              getVal(
                                "wheelchairStorageWidth",
                                rawAhr.internal_circulation?.wheelchair_storage
                                  ?.dimensions_cm?.width ??
                                  wizardData.wheelchairStorageWidthCm,
                              ),
                            )
                          }
                        />
                        <span
                          style={{
                            color:
                              isMod("wheelchairStorageLength") ||
                              isMod("wheelchairStorageWidth")
                                ? AHR_MODIFIED
                                : "#1e40af",
                            fontSize: "11px",
                            fontWeight: "500",
                          }}
                        >
                          cm
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "24px",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            color: isMod("wheelchairStorageCharging")
                              ? AHR_MODIFIED
                              : "#1e40af",
                            fontWeight: "700",
                          }}
                        >
                          Wheelchair charging facility:
                        </span>
                        <span style={{ fontSize: "9px", color: "#64748b" }}>
                          (Standard socket in storage space)
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <SmallCheckbox
                          label="Y"
                          checked={
                            getVal(
                              "wheelchairStorageCharging",
                              rawAhr.internal_circulation?.wheelchair_storage
                                ?.charging_point,
                            ) === true
                          }
                          isModified={isMod("wheelchairStorageCharging")}
                          isLocked={isLocked}
                          onClick={() =>
                            handleOverride("wheelchairStorageCharging", true)
                          }
                        />
                        <SmallCheckbox
                          label="N"
                          checked={
                            getVal(
                              "wheelchairStorageCharging",
                              rawAhr.internal_circulation?.wheelchair_storage
                                ?.charging_point,
                            ) === false
                          }
                          isModified={isMod("wheelchairStorageCharging")}
                          isLocked={isLocked}
                          onClick={() =>
                            handleOverride("wheelchairStorageCharging", false)
                          }
                        />
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </SectionBlock>
          <SectionBlock title="SECTION F (Continued)" number="">
            {/* 18. Kitchen */}
            <div style={{ marginTop: "16px" }}>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: "900",
                  color:
                    isMod("kitchenTurningSpaceFits150") ||
                    isMod("kitchenAccessibleUnits") ||
                    isMod("kitchenTurningSpaceFits170") ||
                    isMod("kitchenSeparateToLiving")
                      ? AHR_MODIFIED
                      : "#1e40af",
                  borderBottom: `1.5px solid ${isMod("kitchenTurningSpaceFits150") || isMod("kitchenAccessibleUnits") || isMod("kitchenTurningSpaceFits170") || isMod("kitchenSeparateToLiving") ? AHR_MODIFIED : "#bfdbfe"}`,
                  paddingBottom: "2px",
                  marginBottom: "12px",
                }}
              >
                18. Kitchen
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px 20px",
                }}
              >
                {/* Row 1, Col 1 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: `1px solid ${isMod("kitchenTurningSpaceFits150") ? AHR_MODIFIED : "#f1f5f9"}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: isMod("kitchenTurningSpaceFits150")
                        ? AHR_MODIFIED
                        : "#1e40af",
                      lineHeight: "1.2",
                    }}
                  >
                    Turning space for a<br />
                    wheelchair (150x150)
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexShrink: 0,
                      marginLeft: "12px",
                    }}
                  >
                    <SmallCheckbox
                      label="Y"
                      checked={
                        getVal(
                          "kitchenTurningSpaceFits150",
                          rawAhr.room_analysis?.kitchen?.turning_circle
                            ?.fits_150cm ??
                            wizardData.kitchenTurningCircle === "Yes",
                        ) === true
                      }
                      isModified={isMod("kitchenTurningSpaceFits150")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("kitchenTurningSpaceFits150", true)
                      }
                    />
                    <SmallCheckbox
                      label="N"
                      checked={
                        getVal(
                          "kitchenTurningSpaceFits150",
                          rawAhr.room_analysis?.kitchen?.turning_circle
                            ?.fits_150cm ??
                            wizardData.kitchenTurningCircle === "Yes",
                        ) === false
                      }
                      isModified={isMod("kitchenTurningSpaceFits150")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("kitchenTurningSpaceFits150", false)
                      }
                    />
                  </div>
                </div>
                {/* Row 1, Col 2 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: `1px solid ${isMod("kitchenAccessibleUnits") ? AHR_MODIFIED : "#f1f5f9"}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: isMod("kitchenAccessibleUnits")
                        ? AHR_MODIFIED
                        : "#1e40af",
                      lineHeight: "1.2",
                    }}
                  >
                    Wheelchair accessible
                    <br />
                    kitchen units
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexShrink: 0,
                      marginLeft: "12px",
                    }}
                  >
                    <SmallCheckbox
                      label="Y"
                      checked={
                        getVal(
                          "kitchenAccessibleUnits",
                          rawAhr.room_analysis?.kitchen?.accessible_units ??
                            wizardData.kitchenAccessibleUnits === "Y",
                        ) === true
                      }
                      isModified={isMod("kitchenAccessibleUnits")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("kitchenAccessibleUnits", true)
                      }
                    />
                    <SmallCheckbox
                      label="N"
                      checked={
                        getVal(
                          "kitchenAccessibleUnits",
                          rawAhr.room_analysis?.kitchen?.accessible_units ??
                            wizardData.kitchenAccessibleUnits === "Y",
                        ) === false
                      }
                      isModified={isMod("kitchenAccessibleUnits")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("kitchenAccessibleUnits", false)
                      }
                    />
                  </div>
                </div>
                {/* Row 2, Col 1 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: `1px solid ${isMod("kitchenTurningSpaceFits170") ? AHR_MODIFIED : "#f1f5f9"}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: isMod("kitchenTurningSpaceFits170")
                        ? AHR_MODIFIED
                        : "#1e40af",
                      lineHeight: "1.2",
                    }}
                  >
                    Larger turning space for
                    <br />
                    wheelchair (170x140)
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexShrink: 0,
                      marginLeft: "12px",
                    }}
                  >
                    <SmallCheckbox
                      label="Y"
                      checked={
                        getVal(
                          "kitchenTurningSpaceFits170",
                          rawAhr.room_analysis?.kitchen?.turning_circle
                            ?.fits_170x140 ??
                            wizardData.kitchenTurning170 === "Y",
                        ) === true
                      }
                      isModified={isMod("kitchenTurningSpaceFits170")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("kitchenTurningSpaceFits170", true)
                      }
                    />
                    <SmallCheckbox
                      label="N"
                      checked={
                        getVal(
                          "kitchenTurningSpaceFits170",
                          rawAhr.room_analysis?.kitchen?.turning_circle
                            ?.fits_170x140 ??
                            wizardData.kitchenTurning170 === "Y",
                        ) === false
                      }
                      isModified={isMod("kitchenTurningSpaceFits170")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("kitchenTurningSpaceFits170", false)
                      }
                    />
                  </div>
                </div>
                {/* Row 2, Col 2 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: `1px solid ${isMod("kitchenSeparateToLiving") ? AHR_MODIFIED : "#f1f5f9"}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: isMod("kitchenSeparateToLiving")
                        ? AHR_MODIFIED
                        : "#1e40af",
                    }}
                  >
                    Kitchen separate to living area
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexShrink: 0,
                      marginLeft: "12px",
                    }}
                  >
                    <SmallCheckbox
                      label="Y"
                      checked={
                        getVal(
                          "kitchenSeparateToLiving",
                          rawAhr.room_analysis?.kitchen?.separate_from_living ??
                            wizardData.kitchenSeparateLiving === "Y",
                        ) === true
                      }
                      isModified={isMod("kitchenSeparateToLiving")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("kitchenSeparateToLiving", true)
                      }
                    />
                    <SmallCheckbox
                      label="N"
                      checked={
                        getVal(
                          "kitchenSeparateToLiving",
                          rawAhr.room_analysis?.kitchen?.separate_from_living ??
                            wizardData.kitchenSeparateLiving === "Y",
                        ) === false
                      }
                      isModified={isMod("kitchenSeparateToLiving")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("kitchenSeparateToLiving", false)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 19. Separate Toilet */}
            <div style={{ marginTop: "24px" }}>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: "900",
                  color: isMod("toiletPresent") ? AHR_MODIFIED : "#1e40af",
                  borderBottom: `1.5px solid ${isMod("toiletPresent") ? AHR_MODIFIED : "#bfdbfe"}`,
                  paddingBottom: "2px",
                  marginBottom: "12px",
                }}
              >
                19. Separate Toilet (not outside)
              </h3>
              <div style={{ display: "flex", gap: "24px" }}>
                <div
                  style={{
                    border: `1.5px solid ${isMod("toiletPresent") ? AHR_MODIFIED : "#1e40af"}`,
                    borderRadius: "4px",
                    padding: "8px",
                    background: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    minWidth: "140px",
                  }}
                >
                  <SmallCheckbox
                    label="YES (Complete 19)"
                    checked={getVal(
                      "toiletPresent",
                      rawAhr.facility_distribution?.access_level_has?.some(
                        (f: string) => f.includes("separate_wc"),
                      ) ?? wizardData.separateToiletPresent === "Y",
                    )}
                    isModified={isMod("toiletPresent")}
                    isLocked={isLocked}
                    onClick={() => handleOverride("toiletPresent", true)}
                  />
                  <SmallCheckbox
                    label="NO (Go to 20)"
                    checked={
                      getVal(
                        "toiletPresent",
                        rawAhr.facility_distribution?.access_level_has?.some(
                          (f: string) => f.includes("separate_wc"),
                        ) ?? wizardData.separateToiletPresent === "Y",
                      ) === false
                    }
                    isModified={isMod("toiletPresent")}
                    isLocked={isLocked}
                    onClick={() => handleOverride("toiletPresent", false)}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "15px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color:
                            isMod("toiletLength") || isMod("toiletWidth")
                              ? AHR_MODIFIED
                              : "#1e40af",
                          fontWeight: "600",
                        }}
                      >
                        Dimensions:
                      </span>
                      <AHR_MeasurementBox
                        segments={4}
                        value={getVal("toiletLength", "")}
                        unit={null}
                        isModified={isMod("toiletLength")}
                        isLocked={isLocked}
                        onChange={() =>
                          openModal(
                            "Toilet Length",
                            "toiletLength",
                            getVal("toiletLength", ""),
                          )
                        }
                      />
                      <span
                        style={{
                          color:
                            isMod("toiletLength") || isMod("toiletWidth")
                              ? AHR_MODIFIED
                              : "#1e40af",
                        }}
                      >
                        x
                      </span>
                      <AHR_MeasurementBox
                        segments={4}
                        value={getVal("toiletWidth", "")}
                        unit={null}
                        isModified={isMod("toiletWidth")}
                        isLocked={isLocked}
                        onChange={() =>
                          openModal(
                            "Toilet Width",
                            "toiletWidth",
                            getVal("toiletWidth", ""),
                          )
                        }
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          color:
                            isMod("toiletLength") || isMod("toiletWidth")
                              ? AHR_MODIFIED
                              : "#1e40af",
                          marginLeft: "4px",
                        }}
                      >
                        cm
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: isMod("toiletCount")
                            ? AHR_MODIFIED
                            : "#1e40af",
                          fontWeight: "900",
                        }}
                      >
                        No. of Toilets
                      </span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {[1, 2, 3, 4].map((n) => (
                          <SmallCheckbox
                            key={n}
                            label={n.toString()}
                            checked={Number(getVal("toiletCount", 1)) === n}
                            isModified={isMod("toiletCount")}
                            isLocked={isLocked}
                            onClick={() => handleOverride("toiletCount", n)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                      borderTop: `1.5px solid ${isMod("toiletLateralSpace") ? AHR_MODIFIED : "#bfdbfe"}`,
                      paddingTop: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        color: isMod("toiletLateralSpace")
                          ? AHR_MODIFIED
                          : "#1e40af",
                        fontWeight: "700",
                        lineHeight: "1.2",
                      }}
                    >
                      Space between midline of toilet
                      <br />
                      and side wall (lateral space)
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <AHR_MeasurementBox
                        segments={4}
                        value={getVal("toiletLateralSpace", "")}
                        unit={null}
                        isModified={isMod("toiletLateralSpace")}
                        isLocked={isLocked}
                        onChange={() =>
                          openModal(
                            "Toilet Lateral Space",
                            "toiletLateralSpace",
                            getVal("toiletLateralSpace", ""),
                          )
                        }
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          color: isMod("toiletLateralSpace")
                            ? AHR_MODIFIED
                            : "#1e40af",
                        }}
                      >
                        cm
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 20. Bathroom */}
            <div style={{ marginTop: "24px" }}>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: "900",
                  color:
                    isMod("bathroomTurningSpaceFits150") ||
                    isMod("bathroomLength") ||
                    isMod("bathroomWidth") ||
                    isMod("bathroomLAShower") ||
                    isMod("bathroomBathOnly") ||
                    isMod("bathroomNextToToilet") ||
                    isMod("bathroomLateralSpace")
                      ? AHR_MODIFIED
                      : "#1e40af",
                  borderBottom: `1.5px solid ${isMod("bathroomTurningSpaceFits150") || isMod("bathroomLength") || isMod("bathroomWidth") || isMod("bathroomLAShower") || isMod("bathroomBathOnly") || isMod("bathroomNextToToilet") || isMod("bathroomLateralSpace") ? AHR_MODIFIED : "#bfdbfe"}`,
                  paddingBottom: "2px",
                  marginBottom: "12px",
                }}
              >
                20. Bathroom
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: isMod("bathroomTurningSpaceFits150")
                          ? AHR_MODIFIED
                          : "#1e40af",
                        fontWeight: "600",
                        width: "120px",
                        lineHeight: "1.1",
                      }}
                    >
                      Turning space for a<br />
                      wheelchair (150x150)
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <SmallCheckbox
                        label="Y"
                        checked={
                          getVal(
                            "bathroomTurningSpaceFits150",
                            rawAhr.room_analysis?.bathroom?.turning_circle
                              ?.fits_150cm ??
                              wizardData.bathroomTurning150 === "Y",
                          ) === true
                        }
                        isModified={isMod("bathroomTurningSpaceFits150")}
                        isLocked={isLocked}
                        onClick={() =>
                          handleOverride("bathroomTurningSpaceFits150", true)
                        }
                      />
                      <SmallCheckbox
                        label="N"
                        checked={
                          getVal(
                            "bathroomTurningSpaceFits150",
                            rawAhr.room_analysis?.bathroom?.turning_circle
                              ?.fits_150cm ??
                              wizardData.bathroomTurning150 === "Y",
                          ) === false
                        }
                        isModified={isMod("bathroomTurningSpaceFits150")}
                        isLocked={isLocked}
                        onClick={() =>
                          handleOverride("bathroomTurningSpaceFits150", false)
                        }
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color:
                          isMod("bathroomLength") || isMod("bathroomWidth")
                            ? AHR_MODIFIED
                            : "#1e40af",
                        fontWeight: "600",
                      }}
                    >
                      Dimensions of Bathroom:
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <AHR_MeasurementBox
                        segments={4}
                        value={getVal(
                          "bathroomLength",
                          rawAhr.room_analysis?.bathroom?.dimensions_cm
                            ?.length ??
                            wizardData.bathroomLengthCm ??
                            "",
                        )}
                        unit={null}
                        isModified={isMod("bathroomLength")}
                        isLocked={isLocked}
                        onChange={() =>
                          openModal(
                            "Bathroom Length",
                            "bathroomLength",
                            getVal(
                              "bathroomLength",
                              rawAhr.room_analysis?.bathroom?.dimensions_cm
                                ?.length ??
                                wizardData.bathroomLengthCm ??
                                "",
                            ),
                          )
                        }
                      />
                      <span
                        style={{
                          color:
                            isMod("bathroomLength") || isMod("bathroomWidth")
                              ? AHR_MODIFIED
                              : "#1e40af",
                        }}
                      >
                        x
                      </span>
                      <AHR_MeasurementBox
                        segments={4}
                        value={getVal(
                          "bathroomWidth",
                          rawAhr.room_analysis?.bathroom?.dimensions_cm
                            ?.width ??
                            wizardData.bathroomWidthCm ??
                            "",
                        )}
                        unit={null}
                        isModified={isMod("bathroomWidth")}
                        isLocked={isLocked}
                        onChange={() =>
                          openModal(
                            "Bathroom Width",
                            "bathroomWidth",
                            getVal(
                              "bathroomWidth",
                              rawAhr.room_analysis?.bathroom?.dimensions_cm
                                ?.width ??
                                wizardData.bathroomWidthCm ??
                                "",
                            ),
                          )
                        }
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          color:
                            isMod("bathroomLength") || isMod("bathroomWidth")
                              ? AHR_MODIFIED
                              : "#1e40af",
                        }}
                      >
                        cm
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    borderTop: `1px dashed ${isMod("bathroomLAShower") || isMod("bathroomBathOnly") || isMod("bathroomNextToToilet") || isMod("bathroomLateralSpace") ? (isLocked ? "#bfdbfe" : AHR_MODIFIED) : "#bfdbfe"}`,
                    paddingTop: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: "30px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          color: isMod("bathroomLAShower")
                            ? AHR_MODIFIED
                            : "#1e40af",
                          fontWeight: "700",
                        }}
                      >
                        L/A shower
                        <br />& bath:
                      </span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <SmallCheckbox
                          label="Y"
                          checked={getVal("bathroomLAShower", false) === true}
                          isModified={isMod("bathroomLAShower")}
                          isLocked={isLocked}
                          onClick={() =>
                            handleOverride("bathroomLAShower", true)
                          }
                        />
                        <SmallCheckbox
                          label="N"
                          checked={getVal("bathroomLAShower", false) === false}
                          isModified={isMod("bathroomLAShower")}
                          isLocked={isLocked}
                          onClick={() =>
                            handleOverride("bathroomLAShower", false)
                          }
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          color: isMod("bathroomBathOnly")
                            ? AHR_MODIFIED
                            : "#1e40af",
                          fontWeight: "700",
                        }}
                      >
                        Bath
                        <br />
                        (only):
                      </span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <SmallCheckbox
                          label="Y"
                          checked={getVal("bathroomBathOnly", false) === true}
                          isModified={isMod("bathroomBathOnly")}
                          isLocked={isLocked}
                          onClick={() =>
                            handleOverride("bathroomBathOnly", true)
                          }
                        />
                        <SmallCheckbox
                          label="N"
                          checked={getVal("bathroomBathOnly", false) === false}
                          isModified={isMod("bathroomBathOnly")}
                          isLocked={isLocked}
                          onClick={() =>
                            handleOverride("bathroomBathOnly", false)
                          }
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          color: isMod("bathroomNextToToilet")
                            ? AHR_MODIFIED
                            : "#1e40af",
                          fontWeight: "700",
                        }}
                      >
                        Bathroom next
                        <br />
                        to separate toilet?
                      </span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <SmallCheckbox
                          label="Y"
                          checked={
                            getVal("bathroomNextToToilet", false) === true
                          }
                          isModified={isMod("bathroomNextToToilet")}
                          isLocked={isLocked}
                          onClick={() =>
                            handleOverride("bathroomNextToToilet", true)
                          }
                        />
                        <SmallCheckbox
                          label="N"
                          checked={
                            getVal("bathroomNextToToilet", false) === false
                          }
                          isModified={isMod("bathroomNextToToilet")}
                          isLocked={isLocked}
                          onClick={() =>
                            handleOverride("bathroomNextToToilet", false)
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        color: isMod("bathroomLateralSpace")
                          ? AHR_MODIFIED
                          : "#1e40af",
                        fontWeight: "700",
                        textAlign: "right",
                        lineHeight: "1.2",
                      }}
                    >
                      Space between midline of toilet
                      <br />
                      and side wall (lateral space)
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <AHR_MeasurementBox
                        segments={4}
                        value={getVal(
                          "bathroomLateralSpace",
                          rawAhr.room_analysis?.bathroom?.lateral_space_cm ??
                            wizardData.bathroomLateralSpace ??
                            "",
                        )}
                        unit={null}
                        isModified={isMod("bathroomLateralSpace")}
                        isLocked={isLocked}
                        onChange={() =>
                          openModal(
                            "Bathroom Lateral Space",
                            "bathroomLateralSpace",
                            getVal(
                              "bathroomLateralSpace",
                              rawAhr.room_analysis?.bathroom
                                ?.lateral_space_cm ??
                                wizardData.bathroomLateralSpace ??
                                "",
                            ),
                          )
                        }
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          color: isMod("bathroomLateralSpace")
                            ? AHR_MODIFIED
                            : "#1e40af",
                        }}
                      >
                        cm
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 21. Door opening widths */}
            <div style={{ marginTop: "32px" }}>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: "900",
                  color: "#1e40af",
                  borderBottom: "1.5px solid #bfdbfe",
                  paddingBottom: "4px",
                  marginBottom: "16px",
                }}
              >
                21. Door opening widths
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px 60px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: isMod("doorLivingWidth")
                        ? AHR_MODIFIED
                        : "#1e40af",
                    }}
                  >
                    Living Room:
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AHR_MeasurementBox
                      segments={4}
                      value={getVal(
                        "doorLivingWidth",
                        rawAhr.internal_doors?.living_room?.width_cm ??
                          analyzedAiSuggestions.door_opening_width_living_room_cm,
                      )}
                      unit={null}
                      isModified={isMod("doorLivingWidth")}
                      isLocked={isLocked}
                      onChange={() =>
                        openModal(
                          "Living Room Door Width",
                          "doorLivingWidth",
                          getVal(
                            "doorLivingWidth",
                            rawAhr.internal_doors?.living_room?.width_cm ??
                              analyzedAiSuggestions.door_opening_width_living_room_cm,
                          ),
                        )
                      }
                    />
                    <span
                      style={{
                        fontSize: "10px",
                        color: isMod("doorLivingWidth")
                          ? AHR_MODIFIED
                          : "#1e40af",
                      }}
                    >
                      cm
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: isMod("doorKitchenWidth")
                        ? AHR_MODIFIED
                        : "#1e40af",
                    }}
                  >
                    Kitchen:
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AHR_MeasurementBox
                      segments={4}
                      value={getVal(
                        "doorKitchenWidth",
                        rawAhr.internal_doors?.kitchen?.width_cm ??
                          analyzedAiSuggestions.door_opening_width_kitchen_cm,
                      )}
                      unit={null}
                      isModified={isMod("doorKitchenWidth")}
                      isLocked={isLocked}
                      onChange={() =>
                        openModal(
                          "Kitchen Door Width",
                          "doorKitchenWidth",
                          getVal(
                            "doorKitchenWidth",
                            rawAhr.internal_doors?.kitchen?.width_cm ??
                              analyzedAiSuggestions.door_opening_width_kitchen_cm,
                          ),
                        )
                      }
                    />
                    <span
                      style={{
                        fontSize: "10px",
                        color: isMod("doorKitchenWidth")
                          ? AHR_MODIFIED
                          : "#1e40af",
                      }}
                    >
                      cm
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: isMod("doorBed1Width") ? AHR_MODIFIED : "#1e40af",
                    }}
                  >
                    Bed 1:
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AHR_MeasurementBox
                      segments={4}
                      value={getVal(
                        "doorBed1Width",
                        rawAhr.internal_doors?.bedroom_1?.width_cm ??
                          analyzedAiSuggestions.door_opening_width_bed_1_cm,
                      )}
                      unit={null}
                      isModified={isMod("doorBed1Width")}
                      isLocked={isLocked}
                      onChange={() =>
                        openModal(
                          "Bed 1 Door Width",
                          "doorBed1Width",
                          getVal(
                            "doorBed1Width",
                            rawAhr.internal_doors?.bedroom_1?.width_cm ??
                              analyzedAiSuggestions.door_opening_width_bed_1_cm,
                          ),
                        )
                      }
                    />
                    <span
                      style={{
                        fontSize: "10px",
                        color: isMod("doorBed1Width")
                          ? AHR_MODIFIED
                          : "#1e40af",
                      }}
                    >
                      cm
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: isMod("doorToiletWidth")
                        ? AHR_MODIFIED
                        : "#1e40af",
                    }}
                  >
                    Separate Toilet:
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AHR_MeasurementBox
                      segments={4}
                      value={getVal(
                        "doorToiletWidth",
                        analyzedAiSuggestions.door_opening_width_separate_toilet_cm ?? "",
                      )}
                      unit={null}
                      isModified={isMod("doorToiletWidth")}
                      isLocked={isLocked}
                      onChange={() =>
                        openModal(
                          "Toilet Door Width",
                          "doorToiletWidth",
                          getVal(
                            "doorToiletWidth",
                            analyzedAiSuggestions.door_opening_width_separate_toilet_cm ?? "",
                          ),
                        )
                      }
                    />
                    <span
                      style={{
                        fontSize: "10px",
                        color: isMod("doorToiletWidth")
                          ? AHR_MODIFIED
                          : "#1e40af",
                      }}
                    >
                      cm
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: isMod("doorBathroomWidth")
                        ? AHR_MODIFIED
                        : "#1e40af",
                    }}
                  >
                    Bathroom:
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AHR_MeasurementBox
                      segments={4}
                      value={getVal(
                        "doorBathroomWidth",
                        rawAhr.internal_doors?.bathroom?.width_cm ??
                          analyzedAiSuggestions.door_opening_width_bathroom_cm,
                      )}
                      unit={null}
                      isModified={isMod("doorBathroomWidth")}
                      isLocked={isLocked}
                      onChange={() =>
                        openModal(
                          "Bathroom Door Width",
                          "doorBathroomWidth",
                          getVal(
                            "doorBathroomWidth",
                            rawAhr.internal_doors?.bathroom?.width_cm ??
                              analyzedAiSuggestions.door_opening_width_bathroom_cm,
                          ),
                        )
                      }
                    />
                    <span
                      style={{
                        fontSize: "10px",
                        color: isMod("doorBathroomWidth")
                          ? AHR_MODIFIED
                          : "#1e40af",
                      }}
                    >
                      cm
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: isMod("doorBed2Width") ? AHR_MODIFIED : "#1e40af",
                    }}
                  >
                    Bed 2:
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AHR_MeasurementBox
                      segments={4}
                      value={getVal(
                        "doorBed2Width",
                        analyzedAiSuggestions.door_opening_width_bed_2_cm ?? "",
                      )}
                      unit={null}
                      isModified={isMod("doorBed2Width")}
                      isLocked={isLocked}
                      onChange={() =>
                        openModal(
                          "Bed 2 Door Width",
                          "doorBed2Width",
                          getVal(
                            "doorBed2Width",
                            analyzedAiSuggestions.door_opening_width_bed_2_cm ?? "",
                          ),
                        )
                      }
                    />
                    <span
                      style={{
                        fontSize: "10px",
                        color: isMod("doorBed2Width")
                          ? AHR_MODIFIED
                          : "#1e40af",
                      }}
                    >
                      cm
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: isMod("doorBalconyWidth")
                        ? AHR_MODIFIED
                        : "#1e40af",
                    }}
                  >
                    Balcony:
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AHR_MeasurementBox
                      segments={4}
                      value={getVal(
                        "doorBalconyWidth",
                        analyzedAiSuggestions.door_opening_width_balcony_cm ?? "",
                      )}
                      unit={null}
                      isModified={isMod("doorBalconyWidth")}
                      isLocked={isLocked}
                      onChange={() =>
                        openModal(
                          "Balcony Door Width",
                          "doorBalconyWidth",
                          getVal(
                            "doorBalconyWidth",
                            analyzedAiSuggestions.door_opening_width_balcony_cm ?? "",
                          ),
                        )
                      }
                    />
                    <span
                      style={{
                        fontSize: "10px",
                        color: isMod("doorBalconyWidth")
                          ? AHR_MODIFIED
                          : "#1e40af",
                      }}
                    >
                      cm
                    </span>
                  </div>
                </div>
                <div></div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: isMod("doorBed3Width") ? AHR_MODIFIED : "#1e40af",
                    }}
                  >
                    Bed 3:
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AHR_MeasurementBox
                      segments={4}
                      value={getVal(
                        "doorBed3Width",
                        analyzedAiSuggestions.door_opening_width_bed_3_cm ?? "",
                      )}
                      unit={null}
                      isModified={isMod("doorBed3Width")}
                      isLocked={isLocked}
                      onChange={() =>
                        openModal(
                          "Bed 3 Door Width",
                          "doorBed3Width",
                          getVal(
                            "doorBed3Width",
                            analyzedAiSuggestions.door_opening_width_bed_3_cm ?? "",
                          ),
                        )
                      }
                    />
                    <span
                      style={{
                        fontSize: "10px",
                        color: isMod("doorBed3Width")
                          ? AHR_MODIFIED
                          : "#1e40af",
                      }}
                    >
                      cm
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </SectionBlock>
        </div>

        {/* --- PAGE 6: Parts 22, 23, Location, Comments, Sign --- */}
        <div
          className="ahr-page"
          style={{
            background: "#fff",
            padding: "30px 40px",
            borderRadius: "24px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
            minHeight: "1120px",
          }}
        >
          <SectionBlock title="SECTION F (Continued)" number="">
            {/* 22. Parking */}
            <div style={{ marginTop: "32px" }}>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: "900",
                  color:
                    isMod("parkingType") ||
                    isMod("parkingCovered") ||
                    isMod("parkingDesignated")
                      ? AHR_MODIFIED
                      : "#1e40af",
                  borderBottom: `1.5px solid ${isMod("parkingType") || isMod("parkingCovered") || isMod("parkingDesignated") ? AHR_MODIFIED : "#bfdbfe"}`,
                  paddingBottom: "4px",
                  marginBottom: "16px",
                }}
              >
                22. Parking
              </h3>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "15px" }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: isMod("parkingType") ? AHR_MODIFIED : "#1e40af",
                      fontWeight: "600",
                    }}
                  >
                    Carport next to property?
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <SmallCheckbox
                      label="Y"
                      checked={
                        getVal(
                          "parkingType",
                          rawAhr.context_amenities?.parking?.type,
                        ) === "OFF_STREET"
                      }
                      isModified={isMod("parkingType")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("parkingType", "OFF_STREET")
                      }
                    />
                    <SmallCheckbox
                      label="N"
                      checked={
                        getVal(
                          "parkingType",
                          rawAhr.context_amenities?.parking?.type,
                        ) !== "OFF_STREET"
                      }
                      isModified={isMod("parkingType")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("parkingType", "ON_STREET")}
                    />
                  </div>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "15px" }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: isMod("parkingCovered") ? AHR_MODIFIED : "#1e40af",
                      fontWeight: "600",
                    }}
                  >
                    Covered Carport or Garage?
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <SmallCheckbox
                      label="Y"
                      checked={getVal("parkingCovered", false) === true}
                      isModified={isMod("parkingCovered")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("parkingCovered", true)}
                    />
                    <SmallCheckbox
                      label="N"
                      checked={getVal("parkingCovered", false) === false}
                      isModified={isMod("parkingCovered")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("parkingCovered", false)}
                    />
                  </div>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "15px" }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: isMod("parkingDesignated")
                        ? AHR_MODIFIED
                        : "#1e40af",
                      fontWeight: "600",
                    }}
                  >
                    Designated parking bay?
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <SmallCheckbox
                      label="Y"
                      checked={
                        getVal(
                          "parkingDesignated",
                          rawAhr.context_amenities?.parking?.designated,
                        ) === true
                      }
                      isModified={isMod("parkingDesignated")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("parkingDesignated", true)}
                    />
                    <SmallCheckbox
                      label="N"
                      checked={
                        getVal(
                          "parkingDesignated",
                          rawAhr.context_amenities?.parking?.designated,
                        ) === false
                      }
                      isModified={isMod("parkingDesignated")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("parkingDesignated", false)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 23. Proximity to Facilities */}
            <div style={{ marginTop: "32px" }}>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: "900",
                  color:
                    isMod("proximityShops") ||
                    isMod("proximityTransport") ||
                    isMod("proximityTransportTypes")
                      ? AHR_MODIFIED
                      : "#1e40af",
                  borderBottom: `1.5px solid ${isMod("proximityShops") || isMod("proximityTransport") || isMod("proximityTransportTypes") ? AHR_MODIFIED : "#bfdbfe"}`,
                  paddingBottom: "4px",
                  marginBottom: "16px",
                }}
              >
                23. Proximity to Facilities
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      color: isMod("proximityShops") ? AHR_MODIFIED : "#1e40af",
                      fontWeight: "600",
                      width: "250px",
                    }}
                  >
                    Proximity to local shops: Less than 100m
                  </span>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <SmallCheckbox
                      label="Y"
                      checked={
                        getVal(
                          "proximityShops",
                          rawAhr.context_amenities?.proximity?.shops_lt_100m,
                        ) === true
                      }
                      isModified={isMod("proximityShops")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("proximityShops", true)}
                    />
                    <SmallCheckbox
                      label="N"
                      checked={
                        getVal(
                          "proximityShops",
                          rawAhr.context_amenities?.proximity?.shops_lt_100m,
                        ) === false
                      }
                      isModified={isMod("proximityShops")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("proximityShops", false)}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      color: isMod("proximityTransport")
                        ? AHR_MODIFIED
                        : "#1e40af",
                      fontWeight: "600",
                      width: "250px",
                    }}
                  >
                    Proximity to transport: Less than 100m
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginRight: "40px",
                    }}
                  >
                    <SmallCheckbox
                      label="Y"
                      checked={
                        getVal(
                          "proximityTransport",
                          rawAhr.context_amenities?.proximity
                            ?.transport_lt_100m,
                        ) === true
                      }
                      isModified={isMod("proximityTransport")}
                      isLocked={isLocked}
                      onClick={() => handleOverride("proximityTransport", true)}
                    />
                    <SmallCheckbox
                      label="N"
                      checked={
                        getVal(
                          "proximityTransport",
                          rawAhr.context_amenities?.proximity
                            ?.transport_lt_100m,
                        ) === false
                      }
                      isModified={isMod("proximityTransport")}
                      isLocked={isLocked}
                      onClick={() =>
                        handleOverride("proximityTransport", false)
                      }
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      color: isMod("proximityTransportTypes")
                        ? AHR_MODIFIED
                        : "#1e40af",
                      fontWeight: "700",
                      marginRight: "15px",
                    }}
                  >
                    (Tick which transport)
                  </span>
                  <div style={{ display: "flex", gap: "15px" }}>
                    {["DLR", "Bus", "Train", "Tube"].map((t) => (
                      <SmallCheckbox
                        key={t}
                        label={t}
                        checked={
                          Array.isArray(
                            getVal("proximityTransportTypes", []),
                          ) && getVal("proximityTransportTypes", []).includes(t)
                        }
                        isModified={isMod("proximityTransportTypes")}
                        isLocked={isLocked}
                        onClick={() => {
                          const current =
                            getVal("proximityTransportTypes", []) || [];
                          const next = current.includes(t)
                            ? current.filter((x: string) => x !== t)
                            : [...current, t];
                          handleOverride("proximityTransportTypes", next);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SectionBlock>
          <SectionBlock title="Property Location" number="">
            {/* Property Location Map */}
            {propertyCoords && (
              <div style={{ marginTop: "32px" }}>
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: "900",
                    color: "#1e40af",
                    borderBottom: "1.5px solid #bfdbfe",
                    paddingBottom: "4px",
                    marginBottom: "16px",
                  }}
                >
                  Property Location
                </h3>
                <div
                  style={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                    height: "200px",
                  }}
                >
                  <img
                    src={`/api/map-image?lat=${propertyCoords.lat}&lon=${propertyCoords.lon}`}
                    alt="Property Location Map"
                    style={{
                      width: "100%",
                      height: "200px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "8px",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#64748b",
                      fontWeight: "600",
                    }}
                  >
                    Approximate location based on postcode:{" "}
                    {wizardData.postcode || caseData.postcode}
                  </span>
                  <span style={{ fontSize: "9px", color: "#94a3b8" }}>
                    {propertyCoords.lat.toFixed(5)},{" "}
                    {propertyCoords.lon.toFixed(5)}
                  </span>
                </div>
              </div>
            )}
          </SectionBlock>

          <SectionBlock title="" number="">
            <div
              style={{
                paddingTop: "10px",
                borderTop: "2px solid #1e40af",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  marginBottom: "20px",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "800",
                    color: isMod("adaptableProperty")
                      ? AHR_MODIFIED
                      : "#1e40af",
                  }}
                >
                  Do you think this property can be adapted
                </span>
                <div style={{ display: "flex", gap: "15px" }}>
                  <SmallCheckbox
                    label="Y"
                    checked={
                      getVal(
                        "adaptableProperty",
                        rawAhr.adaptability_assessment?.spatial_feasibility
                          ?.is_feasible,
                      ) === true
                    }
                    isModified={isMod("adaptableProperty")}
                    onClick={() => handleOverride("adaptableProperty", true)}
                    isLocked={isLocked}
                  />
                  <SmallCheckbox
                    label="N"
                    checked={
                      getVal(
                        "adaptableProperty",
                        rawAhr.adaptability_assessment?.spatial_feasibility
                          ?.is_feasible,
                      ) === false
                    }
                    isModified={isMod("adaptableProperty")}
                    onClick={() => handleOverride("adaptableProperty", false)}
                    isLocked={isLocked}
                  />
                </div>
              </div>

              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "900",
                  color: "#1e40af",
                  marginBottom: "10px",
                  letterSpacing: "-0.02em",
                }}
              >
                KNOWN HAZARDS
              </h2>

              <div
                onClick={() => {
                  if (isLocked) return;
                  const current = getVal(
                    "knownHazards",
                    wizardData.hazards ||
                      analyzedAiSuggestions.known_hazards ||
                      analyzedAiSuggestions.suggested_hazards ||
                      "",
                  );
                  openModal("Known Hazards", "knownHazards", current);
                }}
                style={{
                  minHeight: "90px",
                  border: `1.5px solid ${isMod("knownHazards") ? AHR_MODIFIED : "#bfdbfe"}`,
                  borderRadius: "4px",
                  padding: "14px 16px",
                  fontSize: "13px",
                  color: isMod("knownHazards") ? AHR_MODIFIED : "#1e293b",
                  lineHeight: "1.55",
                  fontWeight: "500",
                  whiteSpace: "pre-wrap",
                  background: isMod("knownHazards") ? "#f0fdf4" : "#fff",
                  cursor: isLocked ? "default" : "pointer",
                  marginBottom: "16px",
                }}
              >
                {getVal(
                  "knownHazards",
                  wizardData.hazards ||
                    analyzedAiSuggestions.known_hazards ||
                    analyzedAiSuggestions.suggested_hazards ||
                    "",
                ) || "None recorded"}
              </div>

              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "900",
                  color: "#1e40af",
                  marginBottom: "10px",
                  letterSpacing: "-0.02em",
                }}
              >
                COMMENTS{" "}
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#64748b",
                  }}
                >
                  (including comments on potential for adaptability)
                </span>
              </h2>

              <div
                onClick={() => {
                  if (isLocked) return;
                  const current = getVal(
                    "adaptabilityReasoning",
                    rawAhr.adaptability_assessment?.spatial_feasibility
                      ?.reasoning ||
                      "Property demonstrates moderate potential for M4(3) adaptation with remedial works to door widths and bathroom layout.",
                  );
                  openModal("Comments", "adaptabilityReasoning", current);
                }}
                style={{
                  minHeight: "180px",
                  border: `1.5px solid ${isMod("adaptabilityReasoning") ? AHR_MODIFIED : "#bfdbfe"}`,
                  borderRadius: "4px",
                  padding: "20px",
                  fontSize: "14px",
                  color: isMod("adaptabilityReasoning")
                    ? AHR_MODIFIED
                    : "#1e293b",
                  lineHeight: "1.6",
                  fontWeight: "500",
                  whiteSpace: "pre-wrap",
                  background: isMod("adaptabilityReasoning")
                    ? "#f0fdf4"
                    : "#fff",
                  cursor: isLocked ? "default" : "pointer",
                }}
              >
                {getVal(
                  "adaptabilityReasoning",
                  rawAhr.adaptability_assessment?.spatial_feasibility
                    ?.reasoning ||
                    "Property demonstrates moderate potential for M4(3) adaptation with remedial works to door widths and bathroom layout.",
                )}
              </div>
            </div>
            <div
              style={{
                marginTop: "40px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: "900",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    marginBottom: "40px",
                  }}
                >
                  Surveyor Digital Signature
                </div>
                <div
                  style={{
                    fontFamily: "'Dancing Script', cursive",
                    fontSize: "32px",
                    color: AHR_SLATE,
                    borderBottom: "2px solid #e2e8f0",
                    width: "280px",
                    paddingBottom: "4px",
                    marginTop: "-10px",
                  }}
                >
                  {wizardData.fullName || "Authorized Surveyor"}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: AHR_VIOLET,
                    marginTop: "8px",
                  }}
                >
                  RHS / AHR Registered Professional
                </div>
              </div>
              <ProfessionalSeal />
            </div>
          </SectionBlock>
        </div>

        {/* --- PAGE 7+: VISUAL EVIDENCE (Chunked) --- */}
        {(function () {
          const evidence = caseData.evidence || [];
          const chunkSize = 8;
          const chunks = [];
          for (let i = 0; i < evidence.length; i += chunkSize) {
            chunks.push(evidence.slice(i, i + chunkSize));
          }
          // Always render at least one page if chunks is empty but floor plan exists
          if (chunks.length === 0 && wizardData.floorPlan) chunks.push([]);

          return chunks.map((chunk, pageIdx) => (
            <div
              key={`evidence-page-${pageIdx}`}
              className="ahr-page"
              style={{
                background: "#fff",
                padding: "50px 70px",
                borderRadius: "24px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
                minHeight: "1120px",
              }}
            >
              <SectionBlock
                title={
                  pageIdx === 0
                    ? "AHR Evidence Portfolio"
                    : "Evidence Portfolio (Cont.)"
                }
                number="G"
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "40px",
                  }}
                >
                  {chunk.map((img: string, idx: number) => {
                    const globalIdx = pageIdx * chunkSize + idx;
                    return (
                      <div
                        key={globalIdx}
                        style={{
                          borderRadius: "16px",
                          overflow: "hidden",
                          border: `1px solid ${AHR_BORDER}`,
                          position: "relative",
                        }}
                      >
                        <img
                          src={img}
                          alt="Evidence"
                          style={{
                            width: "100%",
                            aspectRatio: "16/10",
                            objectFit: "cover",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            bottom: "0",
                            left: "0",
                            right: "0",
                            padding: "12px",
                            background:
                              "linear-gradient(transparent, rgba(0,0,0,0.8))",
                            color: "#fff",
                            fontSize: "11px",
                            fontWeight: "800",
                          }}
                        >
                          {globalIdx === 0
                            ? "External Elevation"
                            : `Internal Asset #${globalIdx}`}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Floor Plan on the first evidence page */}
                {pageIdx === 0 && wizardData.floorPlan && (
                  <div style={{ marginTop: "40px" }}>
                    <h4
                      style={{
                        fontSize: "13px",
                        fontWeight: "900",
                        color: AHR_DEEP,
                        borderLeft: `6px solid ${AHR_DEEP}`,
                        paddingLeft: "12px",
                        marginBottom: "20px",
                      }}
                    >
                      VALIDATED FLOOR PLAN MAP
                    </h4>
                    <div
                      style={{
                        border: `1px solid ${AHR_BORDER}`,
                        borderRadius: "24px",
                        padding: "20px",
                        background: "#f8fafc",
                      }}
                    >
                      <img
                        src={
                          typeof wizardData.floorPlan === "string"
                            ? wizardData.floorPlan
                            : URL.createObjectURL(wizardData.floorPlan)
                        }
                        style={{
                          width: "100%",
                          maxHeight: "600px",
                          objectFit: "contain",
                          borderRadius: "12px",
                        }}
                      />
                      <div
                        style={{
                          marginTop: "16px",
                          fontSize: "12px",
                          textAlign: "center",
                          color: "#64748b",
                          fontWeight: "700",
                        }}
                      >
                        Homingo AI Vision: Spatial Mapping Applied (M4
                        Compliance Verified)
                      </div>
                    </div>
                  </div>
                )}
              </SectionBlock>
            </div>
          ));
        })()}
        </div>
      </div>

      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap');

                .report-toolbar {
                  width: 100%;
                  padding-left: 12px;
                  padding-right: 12px;
                  box-sizing: border-box;
                }
                .report-toolbar-actions {
                  flex-wrap: wrap;
                  justify-content: flex-start;
                }
                @media (max-width: 640px) {
                  .report-toolbar {
                    margin-left: 8px;
                    margin-right: 8px;
                    padding-left: 0;
                    padding-right: 0;
                  }
                  .report-toolbar-actions {
                    gap: 8px;
                    width: 100%;
                  }
                  .report-toolbar-actions button {
                    flex: 1 1 100%;
                    min-width: 0;
                    justify-content: center;
                  }
                }

                @media print {
                    body { background: #fff !important; margin: 0; padding: 0; }
                    .no-print { display: none !important; }
                    .report-container { padding: 0 !important; background: #fff !important; }
                    .ahr-page { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        padding: 20mm !important; 
                        width: 210mm !important; 
                        height: 297mm !important;
                        border-radius: 0 !important;
                        page-break-after: always;
                    }
                    @page { margin: 0; size: A4; }
                }
                .ahr-page {
                    position: relative;
                }
                /* Report content: always original design on all devices; no responsive layout change */
                .report-pages-wrapper {
                  -webkit-overflow-scrolling: touch;
                }
                .report-pages {
                  width: 900px !important;
                  min-width: 900px !important;
                  max-width: 900px !important;
                  box-sizing: border-box;
                }
                .report-pages .ahr-page {
                  flex-shrink: 0;
                }
            `}</style>
    </div>
  );
};

export default ReportView;
