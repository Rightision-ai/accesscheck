import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  User,
  Upload,
  Home,
  ArrowUpRight,
  ChefHat,
  ShieldAlert,
  Ruler,
  Camera,
  Smartphone,
} from "lucide-react";

// Shared Components & Logic
import { complianceEngine } from "@/lib/compliance/ComplianceRuleEngine";
import { registerAllRules } from "@/lib/compliance/ComplianceRules";
import {
  analyzeFloorPlan,
  FloorPlanAnalysisResult,
} from "@/lib/utils/FloorPlanUtils";
import {
  analyzeCategoryPhoto,
  ImageAnalysisResult,
} from "@/lib/utils/ImageAnalysisUtils";
import { toast } from "sonner";

// Modular Step Components
import ProgressBar from "./ProgressBar";
import ClientInfoStep from "./steps/ClientInfoStep";
import FloorPlanStep from "./steps/FloorPlanStep";
import PropertyAccessStep from "./steps/PropertyAccessStep";
import InternalCirculationStep from "./steps/InternalCirculationStep";
import FacilitiesStep from "./steps/FacilitiesStep";
import SafetyHazardsStep from "./steps/SafetyHazardsStep";
import CalibrationStep from "./steps/CalibrationStep";
import SmartCaptureStep from "./steps/SmartCaptureStep";
import AnalysisStep from "./steps/AnalysisStep";

import { Case } from "@/types/dashboard";

const steps = [
  { id: 1, title: "Client", icon: <User size={18} /> },
  { id: 2, title: "Plan", icon: <Upload size={18} /> },
  { id: 3, title: "Capture", icon: <Camera size={18} /> },
  { id: 4, title: "Calibrate", icon: <Ruler size={18} /> },
  { id: 5, title: "Property", icon: <Home size={18} /> },
  { id: 6, title: "Circulation", icon: <ArrowUpRight size={18} /> },
  { id: 7, title: "Facilities", icon: <ChefHat size={18} /> },
  { id: 8, title: "Safety", icon: <ShieldAlert size={18} /> },
  { id: 9, title: "Analysis", icon: <Smartphone size={18} /> },
];

interface AssessmentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (newCase: Case) => void;
  initialData: Partial<Case> | null;
  onSaveDraft: (data: any) => void;
}

const initialFormData = {
  fullName: "",
  phoneNumber: "",
  assessmentDate: new Date().toISOString().split("T")[0],
  doorNo: "",
  streetNo: "",
  buildingName: "",
  street: "",
  postcode: "",
  propertyType: "",
  tenureType: "",
  housingAssociationName: "",
  entranceLevel: "",
  internalStairs: "",
  bedrooms: 0,
  bedSpaces: 1,
  photos: [],
  categoryPhotos: {},
  calibrationWidth: null,
  floorPlan: null,
  hasNoFloorPlan: false,
  bathroomLocation: "",
  // Scoring fields
  mobility: "Use a one-handed aid", // default
  bathing: "Can bathe myself",
  toileting: "Use independently",
  aiReport: null,
};

const AssessmentWizard: React.FC<AssessmentWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialData,
  onSaveDraft,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [floorPlanAnalysis, setFloorPlanAnalysis] =
    useState<FloorPlanAnalysisResult | null>(null);
  const [formData, setFormData] = useState<any>(initialFormData);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, any>>({});
  const [processingCategory, setProcessingCategory] = useState<string | null>(
    null,
  );

  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize/Reset
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Map evidence to photos for wizard consistency
        const data = { ...initialData } as any;
        if (data.evidence && !data.photos) {
          data.photos = data.evidence;
        }
        setFormData({ ...initialFormData, ...data });
        setStep(1);
      } else {
        setFormData(initialFormData);
        setStep(1);
      }
      registerAllRules();
    }
  }, [isOpen, initialData]);

  const handleUpdateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    categoryId?: string,
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Immediate feedback
    setIsProcessing(true);
    if (step === 2) setIsAnalyzing(true);

    try {
      // Convert files to base64 for reliable storage and display
      const processFiles = async (fileList: File[]) => {
        return Promise.all(
          fileList.map(
            (file) =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
              }),
          ),
        );
      };

      const base64Photos = await processFiles(files);

      // If it's a floor plan (Step 2)
      if (step === 2) {
        const file = files[0];
        const base64FloorPlan = base64Photos[0];
        handleUpdateField("floorPlan", base64FloorPlan);

        try {
          const result = await analyzeFloorPlan(file);
          if (result) {
            setFloorPlanAnalysis(result);
            if (result.bedroom_count) {
              handleUpdateField("bedrooms", result.bedroom_count.value);
            }
            if (result.entrance_level) {
              handleUpdateField(
                "entranceLevel",
                result.entrance_level.value === "GROUND"
                  ? "Ground Floor"
                  : "Upper Floor",
              );
            }
            if (result.internal_stairs) {
              handleUpdateField(
                "internalStairs",
                result.internal_stairs.detected ? "Yes" : "No",
              );
            }
          }
        } catch (err) {
          console.error("Floor plan analysis error:", err);
        }
        e.target.value = "";
        return;
      }

      // Categorized photo evidence (Smart Capture)
      if (categoryId) {
        const categoryPhotos = formData.categoryPhotos || {};
        const currentCatPhotos = categoryPhotos[categoryId] || [];
        // Limit to 3 photos per category
        const availableSpace = 3 - currentCatPhotos.length;
        if (availableSpace <= 0) {
          alert("Maximum 3 photos per category allowed.");
          return;
        }
        const newCatPhotos = [
          ...currentCatPhotos,
          ...base64Photos.slice(0, availableSpace),
        ];
        const updatedCategoryPhotos = {
          ...categoryPhotos,
          [categoryId]: newCatPhotos,
        };
        handleUpdateField("categoryPhotos", updatedCategoryPhotos);

        // Also update global photos list for backward compatibility
        const allCategorizedPhotos = Object.values(
          updatedCategoryPhotos,
        ).flat();
        handleUpdateField("photos", allCategorizedPhotos);

        // Trigger AI Analysis for this photo
        setProcessingCategory(categoryId);
        try {
          const analysisResult = await analyzeCategoryPhoto(
            files[0],
            categoryId,
          );

          if (analysisResult) {
            if (analysisResult.valid) {
              // Validation Success
              toast.success(
                `${categoryId.charAt(0).toUpperCase() + categoryId.slice(1)} verified!`,
                {
                  description: "AI detected relevant features.",
                },
              );

              // Merge extracted data
              const newSuggestions = {
                ...aiSuggestions,
                ...analysisResult.data,
              };
              setAiSuggestions(newSuggestions);

              // Auto-fill fields if empty
              const updates: Record<string, any> = {};

              // Mapping logic
              if (categoryId === "kitchen") {
                if (
                  analysisResult.data.turning_circle !== undefined &&
                  !formData.kitchenTurningCircle
                ) {
                  updates.kitchenTurningCircle = analysisResult.data
                    .turning_circle
                    ? "Yes"
                    : "No";
                }
              }
              if (categoryId === "bathroom") {
                if (analysisResult.data.bathing_type && !formData.bathingType)
                  updates.bathingType = analysisResult.data.bathing_type;
                if (analysisResult.data.toilet_type && !formData.toiletType)
                  updates.toiletType = analysisResult.data.toilet_type;
              }
              if (categoryId === "entrance") {
                if (
                  analysisResult.data.entrance_level &&
                  !formData.entranceLevel
                )
                  updates.entranceLevel = analysisResult.data.entrance_level;
              }
              if (categoryId === "stairs") {
                if (
                  analysisResult.data.has_stairs !== undefined &&
                  !formData.internalStairs
                ) {
                  updates.internalStairs = analysisResult.data.has_stairs
                    ? "Yes"
                    : "No";
                }
              }

              // Apply updates
              Object.entries(updates).forEach(([key, val]) => {
                handleUpdateField(key, val);
              });
            } else {
              // Validation Failed
              toast.warning(`Check Photo: ${categoryId}`, {
                description:
                  analysisResult.reason ||
                  "This might not be the correct room.",
              });
            }
          }
        } catch (err) {
          console.error("Smart capture analysis error:", err);
        } finally {
          setProcessingCategory(null);
        }
      } else {
        // Generic photo evidence (Step 8 or other)
        const currentPhotos = Array.isArray(formData.photos)
          ? formData.photos
          : Array.isArray(formData.evidence)
            ? formData.evidence
            : [];
        const newPhotos = [...currentPhotos, ...base64Photos];
        handleUpdateField("photos", newPhotos);
      }
      e.target.value = "";
    } catch (error) {
      console.error("File processing error:", error);
    } finally {
      setIsProcessing(false);
      if (step === 2) setIsAnalyzing(false);
    }
  };

  const isNextDisabled = () => {
    if (step === 1)
      return !formData.fullName || !formData.street || !formData.postcode;
    if (step === 2) return !formData.floorPlan && !formData.hasNoFloorPlan;
    if (step === 3) return (formData.photos || []).length < 1; // Require at least one photo in early capture
    if (step === 4) return !formData.calibrationWidth;
    if (step === 5) return !formData.propertyType || !formData.entranceLevel;
    if (step === 6) return !formData.internalStairs;
    if (step === 7) return !formData.bathroomLocation;
    return false;
  };

  const startAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Simplified mapping for demonstration
      const inferredAnswers = {
        Q2_Stairs:
          formData.internalStairs === "Yes"
            ? "Staircase that turns"
            : "All on one level",
        Q3_Entrance:
          formData.entranceLevel === "Ground Floor"
            ? "No steps, flat"
            : "Few steps",
        Q4_Garden: "No steps, flat", // Default
        Q5_DoorWidth: "More than 76 cm", // Default
        Q7_BathroomDoor: "73–90 cm", // Default
        Q8_ShowerType: "Shower, no steps", // Default
        Q9_ShowerSize: "900×900–1200×1200 mm", // Default
        Q11_WashDryToilet: "No wash/dry toilet", // Default
      };

      console.log("Starting AI Analysis (Rescore)...");
      const response = await fetch("/api/gemini/rescore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wizardData: {
            mobility: formData.mobility,
            bathing: formData.bathing,
            toileting: formData.toileting,
          },
          inferredAnswers,
          observations: [],
        }),
      });

      console.log("AI Analysis (Rescore) Response received");
      const data = await response.json();
      console.log("AI Analysis (Rescore) Result:", data);
      if (data.success && data.result) {
        handleUpdateField("aiReport", {
          ...data.result,
          InferredAnswers: inferredAnswers, // Keep inferred answers
          wizardData: {
            mobility: formData.mobility,
            bathing: formData.bathing,
            toileting: formData.toileting,
          },
        });
      } else {
        console.error("AI Analysis failed:", data);
      }
    } catch (e) {
      console.error("AI Analysis error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        style={modalStyle}
      >
        {/* Header Section */}
        <ProgressBar currentStep={step} steps={steps} />

        {/* Content Area */}
        <div style={contentStyle}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <ClientInfoStep
                key="s1"
                formData={formData}
                handleUpdateField={handleUpdateField}
              />
            )}
            {step === 2 && (
              <FloorPlanStep
                key="s2"
                formData={formData}
                handleUpdateField={handleUpdateField}
                handlePhotoUpload={handlePhotoUpload}
                isAnalyzing={isAnalyzing}
              />
            )}
            {step === 3 && (
              <SmartCaptureStep
                key="s3"
                formData={formData}
                handleUpdateField={handleUpdateField}
                handlePhotoUpload={handlePhotoUpload}
                isProcessing={isProcessing}
                processingCategory={processingCategory}
              />
            )}
            {step === 4 && (
              <CalibrationStep
                key="s4"
                formData={formData}
                handleUpdateField={handleUpdateField}
                handlePhotoUpload={handlePhotoUpload}
              />
            )}
            {step === 5 && (
              <PropertyAccessStep
                key="s5"
                formData={formData}
                handleUpdateField={handleUpdateField}
                floorPlanAnalysis={floorPlanAnalysis}
                aiSuggestions={aiSuggestions}
              />
            )}
            {step === 6 && (
              <InternalCirculationStep
                key="s6"
                formData={formData}
                handleUpdateField={handleUpdateField}
                floorPlanAnalysis={floorPlanAnalysis}
                aiSuggestions={aiSuggestions}
              />
            )}
            {step === 7 && (
              <FacilitiesStep
                key="s7"
                formData={formData}
                handleUpdateField={handleUpdateField}
                floorPlanAnalysis={floorPlanAnalysis}
                aiSuggestions={aiSuggestions}
              />
            )}
            {step === 8 && (
              <SafetyHazardsStep
                key="s8"
                formData={formData}
                handleUpdateField={handleUpdateField}
                floorPlanAnalysis={floorPlanAnalysis}
              />
            )}
            {step === 9 && (
              <AnalysisStep
                key="s9"
                formData={formData}
                handleUpdateField={handleUpdateField}
                isAnalyzing={isAnalyzing}
                onNext={() => {}}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer Controls */}
        <div style={footerStyle}>
          <button onClick={onClose} style={closeButtonStyle}>
            <X size={20} />
          </button>

          <div style={{ display: "flex", gap: "12px" }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                style={secondaryButtonStyle}
              >
                <ChevronLeft size={20} /> Back
              </button>
            )}

            <button
              onClick={() => onSaveDraft(formData)}
              style={{
                ...secondaryButtonStyle,
                borderColor: "var(--primary)",
                color: "var(--primary)",
              }}
            >
              Save Progress
            </button>

            <button
              disabled={isNextDisabled()}
              onClick={() => {
                if (step === 9) {
                  handleSafeClose();
                } else if (step === 8) {
                  setStep(step + 1);
                  startAiAnalysis();
                } else {
                  setStep(step + 1);
                }
              }}
              style={
                isNextDisabled() ? disabledButtonStyle : primaryButtonStyle
              }
            >
              {step === 9
                ? "Complete Assessment"
                : step === 8
                  ? "Start AI Analysis"
                  : "Continue"}
              {step < 9 && <ChevronRight size={20} />}
            </button>
          </div>
        </div>
      </motion.div>

      <style>{`
                :root {
                    --primary: #6366f1;
                    --primary-light: #eef2ff;
                    --border: #f1f5f9;
                    --text-main: #1e293b;
                    --text-dim: #64748b;
                    --bg-surface: #f8fafc;
                }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
            `}</style>
    </div>
  );

  function handleSafeClose() {
    // Logic to complete and close
    const completedCase: Case = {
      id: formData.id || `H-${Math.floor(1000 + Math.random() * 9000)}`,
      applicantName: formData.fullName || "New Client",
      address:
        `${formData.doorNo || ""} ${formData.street || ""}`.trim() ||
        "No Address",
      city: formData.city || "",
      postcode: formData.postcode || "",
      phoneNumber: formData.phoneNumber,
      assessmentDate: formData.assessmentDate,
      aiScore: formData.aiReport?.AccessibilityScore
        ? parseFloat(formData.aiReport.AccessibilityScore)
        : null,
      status: "Completed",
      source: "Manual Entry",
      date: new Date().toISOString(),
      thumbnail:
        (formData.photos && formData.photos[0]) ||
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80",
      evidence: formData.photos || [],
      description: `AHR Assessment for ${formData.fullName || "Client"}`,
      observations: [],
      mlData: {
        imageCount: formData.photos?.length || 0,
        floorPlanAvailable: !!formData.floorPlan,
        wizardData: formData,
        aiReport: formData.aiReport,
      },
    };

    onComplete(completedCase);
    onClose();
  }
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.4)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "780px",
  height: "85vh",
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: "20px",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  border: "1px solid rgba(255,255,255,0.7)",
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "0 16px",
};

const footerStyle: React.CSSProperties = {
  padding: "12px 20px",
  background: "#fff",
  borderTop: "1px solid var(--border)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 20px",
  background: "var(--primary)",
  color: "#fff",
  borderRadius: "12px",
  border: "none",
  fontWeight: "700",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  cursor: "pointer",
  transition: "all 0.2s",
  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 20px",
  background: "#fff",
  color: "var(--text-main)",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  fontWeight: "700",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  cursor: "pointer",
};

const closeButtonStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  background: "#f8fafc",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#64748b",
};

const disabledButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: "#cbd5e1",
  boxShadow: "none",
  cursor: "not-allowed",
  opacity: 0.6,
};

export default AssessmentWizard;
