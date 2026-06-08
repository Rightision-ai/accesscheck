import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  Edit3,
  ArrowRight,
  X,
  User,
  Bath,
  Toilet,
  Trash2,
  Home,
  Calendar,
  Image as ImageIcon,
  FileText,
  Loader,
} from "lucide-react";
import AddObservationModal from "./AddObservationModal";
import ActivityTimeline from "./ActivityTimeline";
import { COEFFICIENTS } from "@/lib/hooks/useScoringEngine";
import { Case } from "@/types/dashboard";
import { cn } from "@/lib/utils/cn";
import {
  buildFinalReportPrompt,
  deriveInferredAnswersFromAssessment,
} from "@/lib/engine/prompts";

const getScoreColor = (score: string | number): string => {
  const s = typeof score === "string" ? parseFloat(score) : score;
  if (s >= 85) return "#059669"; // Success Green
  if (s >= 70) return "#10b981"; // NHS Green
  if (s >= 50) return "#f59e0b"; // Warning Amber
  if (s >= 30) return "#ea580c"; // Safety Orange
  return "#dc2626"; // Danger Red
};

const getScoreColorDark = (score: string | number): string => {
  const s = typeof score === "string" ? parseFloat(score) : score;
  if (s >= 85) return "#064e3b";
  if (s >= 70) return "#065f46";
  if (s >= 50) return "#b45309";
  if (s >= 30) return "#9a3412";
  return "#991b1b";
};

interface PhotoGalleryProps {
  photos: string[];
  onPhotoClick: (photo: string) => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onPhotoClick,
}) => {
  if (!photos || photos.length === 0) {
    return (
      <div className="h-[100px] flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-border text-text-dim text-xs gap-2">
        <ImageIcon size={16} /> No photos provided
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3">
      {photos.map((photo, idx) => (
        <div
          key={idx}
          onClick={() => onPhotoClick(photo)}
          className="aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-border transition-all relative hover:border-primary"
        >
          <img
            src={photo}
            alt={`Evidence ${idx + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
};

interface PhotoModalProps {
  photo: string | null;
  onClose: () => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({ photo, onClose }) => {
  if (!photo) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/90 z-9999 flex items-center justify-center p-5"
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 bg-white/10 border-none rounded-full w-10 h-10 flex items-center justify-center cursor-pointer text-white"
      >
        <X size={24} />
      </button>
      <img
        src={photo}
        alt="Full size"
        className="max-w-full max-h-full rounded-xl"
      />
    </div>
  );
};

interface InfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-border">
    <div className="w-10 h-10 rounded-[10px] bg-primary text-white flex items-center justify-center shrink-0">
      <Icon size={20} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[11px] font-bold text-text-dim uppercase tracking-wider">
        {label}
      </div>
      <div className="text-sm font-bold text-text-main mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
        {value}
      </div>
    </div>
  </div>
);

interface UserInputItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  isEditing: boolean;
  onEdit?: () => void;
  options: Record<string, number>;
  onChange: (val: string) => void;
}

const UserInputItem: React.FC<UserInputItemProps> = ({
  icon: Icon,
  label,
  value,
  isEditing,
  onEdit,
  options,
  onChange,
}) => (
  <div className="p-5 bg-white rounded-xl border border-border">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-[10px] bg-primary text-white flex items-center justify-center">
          <Icon size={18} />
        </div>
        <div>
          <div className="text-xs font-bold text-text-dim uppercase">
            {label}
          </div>
        </div>
      </div>
      <button
        onClick={onEdit}
        className={cn(
          "py-1.5 px-3 rounded-lg border border-border text-xs font-bold cursor-pointer flex items-center gap-1.5",
          isEditing
            ? "bg-red-50 border-red-200 text-red-600"
            : "bg-slate-50 text-text-dim",
        )}
      >
        <Edit3 size={14} /> {isEditing ? "Cancel" : "Edit"}
      </button>
    </div>

    {isEditing ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-3 px-3 rounded-lg border border-border text-sm font-semibold outline-none cursor-pointer"
      >
        {Object.keys(options).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    ) : (
      <div className="text-[15px] font-bold text-text-main">{value}</div>
    )}
  </div>
);

interface InferredItemProps {
  title: string;
  questionKey: string;
  value: string;
  options: Record<string, number>;
  onUpdate: (key: string, val: string) => void;
  isRescoring: boolean;
}

const InferredItem: React.FC<InferredItemProps> = ({
  title,
  questionKey,
  value,
  options,
  onUpdate,
  isRescoring,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (newValue: string) => {
    onUpdate(questionKey, newValue);
    setIsEditing(false);
  };

  return (
    <div className="p-5 bg-white rounded-xl border border-border relative">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="text-xs font-extrabold text-text-main mb-1">
            {title}
          </div>
          {!isEditing && (
            <div className="text-sm font-semibold text-text-dim">
              {value || "Not detected"}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          disabled={isRescoring}
          className={cn(
            "py-1.5 px-3 rounded-lg border border-border text-[11px] font-bold flex items-center gap-1.5 shrink-0 ml-2",
            isEditing
              ? "bg-red-50 border-red-200 text-red-600"
              : "bg-slate-50 text-primary",
            isRescoring && "cursor-not-allowed opacity-50",
          )}
        >
          <Edit3 size={14} /> {isEditing ? "Cancel" : "Edit"}
        </button>
      </div>

      {isEditing && (
        <select
          value={value}
          onChange={(e) => handleSave(e.target.value)}
          disabled={isRescoring}
          className="w-full py-3 px-3 rounded-lg border border-border text-sm font-semibold outline-none cursor-pointer"
        >
          {Object.keys(options).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

interface ValidationInterfaceProps {
  caseData: Case;
  onBack: () => void;
  onUpdateCase: (updatedCase: Case) => void;
  onOpenReport: () => void;
  onDelete: () => void;
  user: { name: string; role: string } | null;
}

const ValidationInterface: React.FC<ValidationInterfaceProps> = ({
  caseData,
  onBack,
  onUpdateCase,
  onOpenReport,
  onDelete,
  user,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isRescoring, setIsRescoring] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [isObservationModalOpen, setIsObservationModalOpen] =
    useState<boolean>(false);
  const [observations, setObservations] = useState<any[]>(
    caseData.mlData?.wizardData?.observations || [],
  );

  // Get AI report data
  const aiReport = caseData.mlData?.aiReport || ({} as any);
  const wizardData = aiReport.wizardData || caseData.mlData?.wizardData || {};

  // Initialize editable values
  const [editedValues, setEditedValues] = useState<Record<string, any>>({
    mobility: wizardData.mobility || "Use a one-handed aid",
    bathing: wizardData.bathing || "Can bathe myself",
    toileting: wizardData.toileting || "Use independently",
    ...aiReport.InferredAnswers,
  });

  const confidenceScore =
    aiReport.ConfidenceScore ||
    (aiReport.Confidence === "HIGH"
      ? "90%"
      : aiReport.Confidence === "LOW"
        ? "55%"
        : "75%");
  const confidenceNumeric = Math.max(
    0,
    Math.min(100, parseFloat(String(confidenceScore).replace("%", "")) || 75),
  );
  const confidenceLevel =
    aiReport.Confidence ||
    (confidenceNumeric >= 80 ? "HIGH" : confidenceNumeric >= 60 ? "MEDIUM" : "LOW");

  const parseJsonPayload = (raw: unknown): Record<string, any> | null => {
    if (!raw) return null;
    if (typeof raw === "object") return raw as Record<string, any>;
    if (typeof raw !== "string") return null;
    let cleaned = raw;
    if (cleaned.includes("```json")) {
      cleaned = cleaned.replace(/```json\n?/, "").replace(/```/, "");
    } else if (cleaned.includes("```")) {
      cleaned = cleaned.replace(/```\n?/, "").replace(/```/, "");
    }
    try {
      return JSON.parse(cleaned);
    } catch {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  const regenerateAiReport = async (
    answers: Record<string, any>,
    observationsInput: any[],
  ) => {
    const inferredAnswers = deriveInferredAnswersFromAssessment(
      {
        ...(caseData.mlData?.wizardData || {}),
        mobility: answers.mobility,
        bathing: answers.bathing,
        toileting: answers.toileting,
      },
      caseData.mlData?.wizardData?.aiSuggestions || aiReport?.analysisData?.aiSuggestions || {},
    );

    const prompt = buildFinalReportPrompt({
      wizardData: {
        ...(caseData.mlData?.wizardData || {}),
        mobility: answers.mobility,
        bathing: answers.bathing,
        toileting: answers.toileting,
      },
      inferredAnswers: {
        ...inferredAnswers,
        ...Object.fromEntries(
          Object.entries(answers).filter(([key]) => key.startsWith("Q")),
        ),
      },
      observations: observationsInput,
      analysisData:
        aiReport?.analysisData || {
          aiSuggestions: caseData.mlData?.wizardData?.aiSuggestions || {},
          floorPlan: caseData.mlData?.wizardData?.floorPlanAnalysis || {},
        },
    });

    const response = await fetch("/api/engine/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, images: [] }),
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "AI analysis failed");
    const parsed = parseJsonPayload(data.result);
    if (!parsed) throw new Error("Could not parse AI response");
    return {
      Confidence: parsed.Confidence || "MEDIUM",
      ConfidenceScore: parsed.ConfidenceScore || "75%",
      Summary: parsed.Summary || { Strengths: "", Weaknesses: "", Recommendation: "" },
      ReportData: parsed.ReportData || {},
      analysisData:
        aiReport?.analysisData || {
          aiSuggestions: caseData.mlData?.wizardData?.aiSuggestions || {},
          floorPlan: caseData.mlData?.wizardData?.floorPlanAnalysis || {},
        },
      InferredAnswers: {
        ...inferredAnswers,
        ...Object.fromEntries(
          Object.entries(answers).filter(([key]) => key.startsWith("Q")),
        ),
      },
      wizardData: {
        mobility: answers.mobility,
        bathing: answers.bathing,
        toileting: answers.toileting,
      },
    };
  };

  const handleSaveObservation = async (observation: any) => {
    const updatedObservations = [...observations, observation];
    setObservations(updatedObservations);
    setIsRescoring(true);
    console.log("Sending observation for re-scoring...");

    try {
      const newReport = await regenerateAiReport(editedValues, updatedObservations);
      const updatedCase = {
        ...caseData,
        aiScore: null,
        observations: updatedObservations,
        mlData: {
          ...caseData.mlData,
          aiReport: {
            ...aiReport,
            ...newReport,
            InferredAnswers: editedValues,
            wizardData: {
              mobility: editedValues.mobility,
              bathing: editedValues.bathing,
              toileting: editedValues.toileting,
            },
          },
        },
      };

      onUpdateCase(updatedCase);
    } catch (error) {
      console.error("AI report regeneration error:", error);
    } finally {
      setIsRescoring(false);
    }
  };

  const handleOverride = async (key: string, newValue: string) => {
    const updatedAnswers = { ...editedValues, [key]: newValue };
    setEditedValues(updatedAnswers);
    setIsRescoring(true);
    console.log("Sending override for re-scoring...");

    try {
      const newReport = await regenerateAiReport(updatedAnswers, observations);
      const updatedCase = {
        ...caseData,
        aiScore: null,
        mlData: {
          ...caseData.mlData,
          aiReport: {
            ...aiReport,
            ...newReport,
            InferredAnswers: updatedAnswers,
            wizardData: {
              mobility: updatedAnswers.mobility,
              bathing: updatedAnswers.bathing,
              toileting: updatedAnswers.toileting,
            },
          },
        },
      };

      onUpdateCase(updatedCase);
    } catch (error) {
      console.error("AI report regeneration error:", error);
    } finally {
      setIsRescoring(false);
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const updatedCase: Case = {
        ...caseData,
        status: "Review",
        mlData: {
          ...caseData.mlData,
          aiReport: {
            ...aiReport,
            InferredAnswers: editedValues,
            wizardData: {
              mobility: editedValues.mobility,
              bathing: editedValues.bathing,
              toileting: editedValues.toileting,
            },
          } as any,
        },
      };
      onUpdateCase(updatedCase);
      setIsSubmitting(false);
      setShowSuccess(true);
    }, 1500);
  };

  if (showSuccess) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-[500px]"
        >
          <CheckCircle size={64} className="text-emerald-600 mb-6" />
          <h2 className="text-2xl font-extrabold text-text-main mb-3">
            Assessment Completed!
          </h2>
          <p className="text-text-dim text-base mb-8">
            The assessment has been saved and is ready for reporting.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={onBack}
              className="py-3.5 px-6 rounded-xl bg-slate-50 font-bold border border-border"
            >
              Return to Dashboard
            </button>
            <button
              onClick={onOpenReport}
              className="py-3.5 px-8 rounded-xl bg-primary text-white font-extrabold flex items-center gap-2 shadow-sm border-none"
            >
              View Official Report <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const inferredItems = [
    {
      key: "Q2_Stairs",
      title: "Stairs Configuration",
      options: COEFFICIENTS.Q2,
    },
    { key: "Q3_Entrance", title: "Main Entrance", options: COEFFICIENTS.Q3 },
    { key: "Q4_Garden", title: "Garden Access", options: COEFFICIENTS.Q4 },
    {
      key: "Q5_DoorWidth",
      title: "Internal Door Width",
      options: COEFFICIENTS.Q5,
    },
    {
      key: "Q7_BathroomDoor",
      title: "Bathroom Door Width",
      options: COEFFICIENTS.Q7,
    },
    {
      key: "Q8_ShowerType",
      title: "Shower/Bath Type",
      options: COEFFICIENTS.Q8,
    },
    { key: "Q9_ShowerSize", title: "Shower Size", options: COEFFICIENTS.Q9 },
    {
      key: "Q11_WashDryToilet",
      title: "Wash/Dry Toilet",
      options: COEFFICIENTS.Q11,
    },
  ];

  return (
    <div
      style={{
        background: "#f8f9fc",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          background: "#fff",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={onBack}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "var(--bg-surface)",
                color: "var(--text-main)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: "800",
                  color: "var(--text-main)",
                  margin: 0,
                }}
              >
                Case {caseData.id} • Validation
              </h1>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-dim)",
                  margin: "4px 0 0",
                }}
              >
                Review and validate AI assessment
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => setIsObservationModalOpen(true)}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                background: "#005EB8",
                border: "none",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "700",
                boxShadow: "0 2px 8px rgba(0, 94, 184, 0.2)",
              }}
            >
              <FileText size={18} />
              Add Observation
            </button>

            <button
              onClick={onDelete}
              title="Delete Case"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#fff",
                border: "1px solid #fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          padding: "32px 24px",
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* Case Snapshot Banner */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "40px",
            background: "#fff",
            padding: "32px",
            borderRadius: "24px",
            border: "1px solid var(--border)",
            marginBottom: "32px",
            alignItems: "stretch",
            boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
          }}
        >
          {/* Left Side: KPIs (Confidence) */}
          <div style={{ display: "flex", gap: "20px", flex: "0 0 auto" }}>
            {/* Confidence Score Card */}
            <div
              style={{
                background: `linear-gradient(135deg, ${getScoreColor(confidenceNumeric)} 0%, ${getScoreColorDark(confidenceNumeric)} 100%)`,
                borderRadius: "20px",
                padding: "24px",
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "160px",
                height: "160px",
                boxShadow: `0 8px 24px ${getScoreColor(confidenceNumeric)}40`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  opacity: 0.9,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Confidence
              </div>
              {isRescoring ? (
                <Loader className="animate-spin" size={32} />
              ) : (
                <>
                  <div
                    style={{
                      fontSize: "48px",
                      fontWeight: "900",
                      lineHeight: 1,
                    }}
                  >
                    {Math.round(confidenceNumeric)}
                  </div>
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "4px 12px",
                      background: "rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "800",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    Level: {confidenceLevel}
                  </div>
                </>
              )}
            </div>

            {/* Confidence Card */}
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "20px",
                padding: "24px",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "160px",
                height: "160px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "#10b98110",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                }}
              >
                <CheckCircle size={24} />
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: "4px",
                }}
              >
                Confidence
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: "900",
                  color: "var(--text-main)",
                  lineHeight: 1,
                }}
              >
                {confidenceScore}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color:
                    confidenceNumeric >= 80
                      ? "#10b981"
                      : confidenceNumeric >= 50
                        ? "#f59e0b"
                        : "#ef4444",
                  marginTop: "4px",
                }}
              >
                {confidenceNumeric >= 80
                  ? "High Accuracy"
                  : confidenceNumeric >= 50
                    ? "Medium Accuracy"
                    : "Low Accuracy"}
              </div>
            </div>
          </div>

          {/* Divider Area (Desktop only) */}
          <div
            style={{
              width: "1px",
              background: "var(--border)",
              alignSelf: "stretch",
              margin: "10px 0",
            }}
          />

          {/* Right Side: Case Metadata */}
          <div
            style={{
              flex: "1 1 300px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    padding: "10px",
                    borderRadius: "12px",
                    background: "var(--primary-light)",
                    color: "var(--primary)",
                  }}
                >
                  <Home size={20} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "var(--text-dim)",
                      marginBottom: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    Property Address
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "800",
                      color: "var(--text-main)",
                      lineHeight: 1.4,
                    }}
                  >
                    {caseData.address}
                    <br />
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        opacity: 0.7,
                      }}
                    >
                      {caseData.city}, {caseData.postcode}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    padding: "10px",
                    borderRadius: "12px",
                    background: "#f0f4ff",
                    color: "#3b82f6",
                  }}
                >
                  <Calendar size={20} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "var(--text-dim)",
                      marginBottom: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    Assessment Date
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "800",
                      color: "var(--text-main)",
                    }}
                  >
                    {caseData.assessmentDate}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--text-dim)",
                      marginTop: "2px",
                    }}
                  >
                    Standard Field Survey
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Inputs Section */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "32px",
            border: "1px solid var(--border)",
            marginBottom: "32px",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "var(--text-main)",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <User size={20} color="var(--primary)" /> User Inputs
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            <UserInputItem
              icon={User}
              label="Mobility"
              value={editedValues.mobility}
              isEditing={false}
              onEdit={() => {}}
              options={COEFFICIENTS.Q1}
              onChange={(val) => handleOverride("mobility", val)}
            />
            <UserInputItem
              icon={Bath}
              label="Bathing"
              value={editedValues.bathing}
              isEditing={false}
              onEdit={() => {}}
              options={COEFFICIENTS.Q6}
              onChange={(val) => handleOverride("bathing", val)}
            />
            <UserInputItem
              icon={Toilet}
              label="Toileting"
              value={editedValues.toileting}
              isEditing={false}
              onEdit={() => {}}
              options={COEFFICIENTS.Q10}
              onChange={(val) => handleOverride("toileting", val)}
            />
          </div>
        </div>

        {/* Evidence Photos */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "32px",
            border: "1px solid var(--border)",
            marginBottom: "32px",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "var(--text-main)",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ImageIcon size={20} color="var(--primary)" /> Evidence Photos
          </h3>
          <PhotoGallery
            photos={caseData.evidence}
            onPhotoClick={(photo) => setSelectedPhoto(photo)}
          />
        </div>

        {/* AI Inferred Assessment */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "32px",
            border: "1px solid var(--border)",
            marginBottom: "32px",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "var(--text-main)",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle size={20} color="var(--primary)" /> AI Inferred
            Assessment
          </h3>
          <p
            style={{
              margin: "0 0 24px",
              fontSize: "13px",
              color: "var(--text-dim)",
            }}
          >
            Review the AI's findings. Click 'Edit' to override any value.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {inferredItems.map((item) => (
              <InferredItem
                key={item.key}
                title={item.title}
                questionKey={item.key}
                value={editedValues[item.key]}
                options={item.options}
                onUpdate={handleOverride}
                isRescoring={isRescoring}
              />
            ))}
          </div>
        </div>

        {/* Activity Timeline */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "32px",
            border: "1px solid var(--border)",
            marginBottom: "100px",
          }}
        >
          <div
            style={{
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "var(--text-main)",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <FileText size={20} color="var(--primary)" /> Activity Timeline
              </h3>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "13px",
                  color: "var(--text-dim)",
                }}
              >
                Chronological log of all professional observations
              </p>
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "var(--text-dim)",
                background: "var(--bg-surface)",
                padding: "8px 16px",
                borderRadius: "8px",
              }}
            >
              {observations.length}{" "}
              {observations.length === 1 ? "Entry" : "Entries"}
            </div>
          </div>
          <ActivityTimeline
            observations={observations}
            onAddFollowup={() => {}}
          />
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border py-5 px-6 z-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-6 items-center flex-wrap">
            <div>
              <div className="text-[11px] text-text-dim font-bold uppercase">
                Last Updated
              </div>
              <div className="text-sm font-bold text-text-main">Just now</div>
            </div>
          </div>

          <button
            disabled={isSubmitting || isRescoring}
            onClick={
              caseData.status === "Completed" || caseData.status === "Review"
                ? onOpenReport
                : handleSubmit
            }
            className={cn(
              "py-3.5 px-8 rounded-xl text-[15px] font-extrabold border-none flex items-center gap-2.5",
              isSubmitting || isRescoring
                ? "bg-slate-300 text-white cursor-not-allowed"
                : "bg-primary text-white cursor-pointer shadow-[0_4px_12px_var(--primary-glow)]",
            )}
          >
            {isSubmitting ? (
              <>
                <Loader className="animate-spin" size={20} />
                Processing...
              </>
            ) : caseData.status === "Completed" ||
              caseData.status === "Review" ? (
              <>
                View Report
                <ArrowRight size={20} />
              </>
            ) : (
              <>
                Confirm & Save
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Photo Modal */}
      <PhotoModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />

      {/* Observation Modal */}
      <AddObservationModal
        isOpen={isObservationModalOpen}
        onClose={() => setIsObservationModalOpen(false)}
        onSave={handleSaveObservation}
        user={user}
        caseId={caseData.id}
      />
    </div>
  );
};

export default ValidationInterface;
