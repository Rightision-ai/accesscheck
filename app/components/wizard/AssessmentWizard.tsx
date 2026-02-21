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
  Camera,
  Smartphone,
  RefreshCw,
  CheckCircle,
  Copy,
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
  analyzeAllCategoryPhotos,
  compressBase64Image,
  ImageAnalysisResult,
  BatchAnalysisResult,
} from "@/lib/utils/ImageAnalysisUtils";
import { uploadBase64ToStorage } from "@/lib/surveys/upload";
import { convertHeicToJpegIfNeeded } from "@/lib/utils/imageUtils";
import { saveSurveyClient } from "@/lib/surveys/client";
import { toast } from "sonner";

// Modular Step Components
import ProgressBar from "./ProgressBar";
import ClientInfoStep from "./steps/ClientInfoStep";
import MultiplePropertiesStep from "./steps/MultiplePropertiesStep";
import FloorPlanStep from "./steps/FloorPlanStep";
import PropertyAccessStep from "./steps/PropertyAccessStep";
import InternalCirculationStep from "./steps/InternalCirculationStep";
import FacilitiesStep from "./steps/FacilitiesStep";
import SafetyHazardsStep from "./steps/SafetyHazardsStep";
import SmartCaptureStep from "./steps/SmartCaptureStep";
import AnalysisStep from "./steps/AnalysisStep";

import { Case } from "@/types/dashboard";
import { cn } from "@/lib/utils/cn";

const steps = [
  { id: 1, title: "Client", icon: <User size={18} /> },
  { id: 2, title: "Identical Units", icon: <Copy size={18} /> },
  { id: 3, title: "Plan", icon: <Upload size={18} /> },
  { id: 4, title: "Capture", icon: <Camera size={18} /> },
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
  floorPlan: null,
  hasNoFloorPlan: false,
  bathroomLocation: "",
  // Scoring fields
  mobility: "Use a one-handed aid", // default
  bathing: "Can bathe myself",
  toileting: "Use independently",
  aiReport: null,
  // Section B
  multipleProperties: "No",
  multiplePropertiesCount: "",
  // AI-populated structural fields (from floor plan + photo analysis)
  aiSuggestions: {} as Record<string, any>,
  floorLevelNumber: "",
  stairWidth: "",
  stairBottomClearance: "",
  internalHandrails: "",
  internalStairsType: "",
  hallwayWidthHeadOn: "",
  hallwayWidthTurn: "",
  wheelchairStoragePresent: "",
  wheelchairStorageLengthCm: "",
  wheelchairStorageWidthCm: "",
  bathroomLengthCm: "",
  bathroomWidthCm: "",
  bathroomLateralSpace: "",
  separateToiletPresent: "",
  kitchenTurning170: "",
  kitchenAccessibleUnits: "",
  kitchenSeparateLiving: "",
  bathroomTurning150: "",
  communalDoorPresent: "",
  communalStepCount: "",
  communalLiftCount: "",
  gardenAccess: "",
  balconyPresent: "",
  balconyStepCount: "",
  parkingPresent: "",
  propertyRampPresent: "",
  facilitiesAccessLevel: [] as string[],
  facilitiesAboveLevel: [] as string[],
  facilitiesBelowLevel: [] as string[],
};

const AssessmentWizard: React.FC<AssessmentWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialData,
  onSaveDraft,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [step3AnalysisComplete, setStep3AnalysisComplete] = useState(false);
  const [categoryResults, setCategoryResults] = useState<
    Record<string, "valid" | "invalid">
  >({});
  const [floorPlanAnalysis, setFloorPlanAnalysis] =
    useState<FloorPlanAnalysisResult | null>(null);
  const [formData, setFormData] = useState<any>(initialFormData);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
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

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const draftCase: Case = {
        id: formData.id || `H-${Math.floor(1000 + Math.random() * 9000)}`,
        applicantName: formData.fullName || "New Client",
        address:
          `${formData.doorNo || ""} ${formData.street || ""}`.trim() ||
          "No Address",
        city: formData.city || "",
        postcode: formData.postcode || "",
        phoneNumber: formData.phoneNumber,
        assessmentDate: formData.assessmentDate,
        aiScore: null,
        status: "Draft",
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

      const result = await saveSurveyClient(draftCase);
      if (result.error) {
        toast.error(`Failed to save draft: ${result.error}`);
        return;
      }

      const savedId = result.id ?? draftCase.id;
      // Persist real DB id into formData so subsequent saves update the same record
      setFormData((prev: any) => ({ ...prev, id: savedId }));

      toast.success("Draft saved — you can continue later from the dashboard.");
      onSaveDraft({ ...draftCase, id: savedId });
    } catch (err) {
      toast.error("An unexpected error occurred while saving.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    categoryId?: string,
  ) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    setIsProcessing(true);
    if (step === 3) setIsAnalyzing(true);

    try {
      const files = await Promise.all(
        rawFiles.map((f) => convertHeicToJpegIfNeeded(f))
      );

      /** Read a File into a base64 data URL */
      const toBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      /** Compress then upload to Supabase; return the public URL */
      const uploadPhoto = async (base64: string): Promise<string> => {
        const compressed = await compressBase64Image(base64);
        const path = `wizard/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        return uploadBase64ToStorage(compressed, path);
      };

      // ── Floor plan (Step 3) ──────────────────────────────────────────────
      if (step === 3) {
        const file = files[0];
        const base64 = await toBase64(file);

        // Upload to Supabase and store URL for display; fall back to base64
        try {
          const url = await uploadPhoto(base64);
          handleUpdateField("floorPlan", url);
        } catch {
          handleUpdateField("floorPlan", base64);
        }

        // Analyse with original File object (Gemini needs the raw file here)
        try {
          const result = await analyzeFloorPlan(file);
          if (result) {
            setFloorPlanAnalysis(result);
            if (result.bedroom_count)
              handleUpdateField("bedrooms", result.bedroom_count.value);
            if (result.entrance_level)
              handleUpdateField(
                "entranceLevel",
                result.entrance_level.value === "GROUND"
                  ? "Ground Floor"
                  : result.entrance_level.value === "BASEMENT"
                    ? "Basement"
                    : "Upper Floor",
              );
            if (result.internal_stairs)
              handleUpdateField(
                "internalStairs",
                result.internal_stairs.detected ? "Yes" : "No",
              );
            // New floor plan fields
            if (result.floor_level_number)
              handleUpdateField("floorLevelNumber", String(result.floor_level_number));
            if (result.stair_geometry)
              handleUpdateField("internalStairsType", result.stair_geometry);
            // External access — set to "No" if not detected (definitive default from floor plan)
            handleUpdateField("gardenAccess", result.external_access?.garden_present ? "Yes" : "No");
            handleUpdateField("balconyPresent", result.external_access?.balcony_present ? "Yes" : "No");
            handleUpdateField("parkingPresent", result.external_access?.parking_present ? "Yes" : "No");
            handleUpdateField("secondExit", result.second_exit?.detected ? "Yes" : "No");
            // Communal
            if (result.communal) {
              handleUpdateField("communalDoorPresent", result.communal.communal_door_present ? "Y" : "N");
              handleUpdateField("communalLiftCount", String(result.communal.communal_lift_count ?? 0));
            }
            // Facilities per floor
            if (result.facilities_per_floor) {
              handleUpdateField("facilitiesAccessLevel", result.facilities_per_floor.access_level ?? []);
              handleUpdateField("facilitiesAboveLevel", result.facilities_per_floor.above ?? []);
              handleUpdateField("facilitiesBelowLevel", result.facilities_per_floor.below ?? []);
            }
          }
        } catch (err) {
          console.error("Floor plan analysis error:", err);
        }
        e.target.value = "";
        return;
      }

      // ── Categorised evidence (Step 3 Smart Capture) ─────────────────────
      if (categoryId) {
        const categoryPhotos = formData.categoryPhotos || {};
        const currentCatPhotos = categoryPhotos[categoryId] || [];
        const availableSpace = 3 - currentCatPhotos.length;
        if (availableSpace <= 0) {
          toast.warning("Maximum 3 photos per category allowed.");
          e.target.value = "";
          return;
        }

        // Read, compress, and upload each file; collect Supabase URLs
        const uploadedUrls = await Promise.all(
          files.slice(0, availableSpace).map(async (file) => {
            const base64 = await toBase64(file);
            try {
              return await uploadPhoto(base64);
            } catch {
              // Fall back to base64 if upload fails (e.g. local dev with no bucket)
              toast.error("Image upload failed — using local preview.");
              return base64;
            }
          }),
        );

        const newCatPhotos = [...currentCatPhotos, ...uploadedUrls];
        const updatedCategoryPhotos = {
          ...categoryPhotos,
          [categoryId]: newCatPhotos,
        };
        handleUpdateField("categoryPhotos", updatedCategoryPhotos);
        handleUpdateField(
          "photos",
          Object.values(updatedCategoryPhotos).flat(),
        );

        // Reset analysis state so re-analysis is required
        setStep3AnalysisComplete(false);
        setCategoryResults({});
      } else {
        // Generic evidence (other steps)
        const currentPhotos = Array.isArray(formData.photos)
          ? formData.photos
          : Array.isArray(formData.evidence)
            ? formData.evidence
            : [];
        const uploadedUrls = await Promise.all(
          files.map(async (file) => {
            const base64 = await toBase64(file);
            try {
              return await uploadPhoto(base64);
            } catch {
              return base64;
            }
          }),
        );
        handleUpdateField("photos", [...currentPhotos, ...uploadedUrls]);
      }
      e.target.value = "";
    } catch (error) {
      console.error("File processing error:", error);
      toast.error("Photo conversion failed. Please try again.");
    } finally {
      setIsProcessing(false);
      if (step === 3) setIsAnalyzing(false);
    }
  };

  const startStep3BatchAnalysis = async () => {
    const categoryPhotos = formData.categoryPhotos || {};
    if (Object.keys(categoryPhotos).length === 0) return;

    setIsAnalyzing(true);
    setValidationErrors({});
    setCategoryResults({});

    try {
      const result = await analyzeAllCategoryPhotos(categoryPhotos);

      if (result) {
        // Process results
        let hasErrors = false;
        let stopReason: string | null = null;
        const newErrors: Record<string, string> = {};
        const newSuggestions = { ...aiSuggestions };
        const newCategoryResults: Record<string, "valid" | "invalid"> = {};

        // Handle per-category validation
        Object.entries(result.results).forEach(([catId, res]) => {
          newCategoryResults[catId] = res.valid ? "valid" : "invalid";
          if (res.valid) {
            Object.assign(newSuggestions, res.data);

            // Check for Stop Flags from AI
            if (res.data.stop_assessment_flag) {
              stopReason =
                res.data.stop_reason || `Critical issue detected in ${catId}`;
            }
          } else {
            hasErrors = true;
            newErrors[catId] = res.reason || "Image validation failed";
          }
        });
        setCategoryResults(newCategoryResults);

        // Add safety suggestions
        if (result.safety) {
          Object.assign(newSuggestions, result.safety);
        }

        setValidationErrors(newErrors);
        setAiSuggestions(newSuggestions);
        // Persist aiSuggestions into formData so ReportView can access them
        handleUpdateField("aiSuggestions", newSuggestions);
        setStep3AnalysisComplete(true);

        if (stopReason) {
          // Store stop flag in formData so the AHR report can surface it
          handleUpdateField("ahcStopFlag", stopReason);
          toast.warning("Potential stop criterion detected", {
            description: `${stopReason} — this will be flagged in the final AHR report.`,
            duration: 8000,
          });
        }

        if (hasErrors) {
          toast.warning("Some photos couldn't be verified", {
            description: "Please check the highlighted categories.",
          });
        } else if (!stopReason) {
          toast.success("All photos analyzed successfully!");
        }

        // Auto-fill logic (Batch)
        const updates: Record<string, any> = {};

        // ── Kitchen ──────────────────────────────────────────────────────────
        if (
          newSuggestions.turning_circle !== undefined &&
          !formData.kitchenTurningCircle
        ) {
          updates.kitchenTurningCircle = newSuggestions.turning_circle
            ? "Yes"
            : "No";
        }

        // ── Bathroom ─────────────────────────────────────────────────────────
        if (newSuggestions.bathing_type && !formData.bathingType)
          updates.bathingType = newSuggestions.bathing_type;
        if (newSuggestions.toilet_type && !formData.toiletType)
          updates.toiletType = newSuggestions.toilet_type;
        if (newSuggestions.turning_circle !== undefined && !formData.bathroomTurning150)
          updates.bathroomTurning150 = newSuggestions.turning_circle ? "Y" : "N";
        if (newSuggestions.length_estimate_cm && !formData.bathroomLengthCm)
          updates.bathroomLengthCm = String(newSuggestions.length_estimate_cm);
        if (newSuggestions.width_estimate_cm && !formData.bathroomWidthCm)
          updates.bathroomWidthCm = String(newSuggestions.width_estimate_cm);
        if (newSuggestions.lateral_space_estimate_cm && !formData.bathroomLateralSpace)
          updates.bathroomLateralSpace = String(newSuggestions.lateral_space_estimate_cm);
        if (newSuggestions.has_separate_toilet !== undefined && !formData.separateToiletPresent)
          updates.separateToiletPresent = newSuggestions.has_separate_toilet ? "Y" : "N";

        // ── Kitchen additional ───────────────────────────────────────────────
        if (newSuggestions.turning_circle_170x140 !== undefined && !formData.kitchenTurning170)
          updates.kitchenTurning170 = newSuggestions.turning_circle_170x140 ? "Y" : "N";
        if (newSuggestions.accessible_layout !== undefined && !formData.kitchenAccessibleUnits)
          updates.kitchenAccessibleUnits = newSuggestions.accessible_layout ? "Y" : "N";
        if (newSuggestions.separate_from_living !== undefined && !formData.kitchenSeparateLiving)
          updates.kitchenSeparateLiving = newSuggestions.separate_from_living ? "Y" : "N";

        // ── Entrance ─────────────────────────────────────────────────────────
        if (newSuggestions.entrance_level && !formData.entranceLevel)
          updates.entranceLevel = newSuggestions.entrance_level;
        if (newSuggestions.communal_entrance !== undefined && !formData.communalDoorPresent)
          updates.communalDoorPresent = newSuggestions.communal_entrance ? "Y" : "N";
        if (newSuggestions.communal_step_count !== undefined && !formData.communalStepCount)
          updates.communalStepCount = String(newSuggestions.communal_step_count);
        if (newSuggestions.ramp_present !== undefined && !formData.propertyRampPresent)
          updates.propertyRampPresent = newSuggestions.ramp_present ? "Y" : "N";

        // ── Stairs ───────────────────────────────────────────────────────────
        if (newSuggestions.has_stairs !== undefined && !formData.internalStairs)
          updates.internalStairs = newSuggestions.has_stairs ? "Yes" : "No";
        if (newSuggestions.stair_type && !formData.internalStairsType)
          updates.internalStairsType = newSuggestions.stair_type;
        if (newSuggestions.handrails && !formData.internalHandrails)
          updates.internalHandrails = newSuggestions.handrails;
        if (newSuggestions.estimated_stair_width_cm && !formData.stairWidth)
          updates.stairWidth = String(newSuggestions.estimated_stair_width_cm);
        if (newSuggestions.estimated_clearance_at_bottom_cm !== undefined && !formData.stairBottomClearance)
          updates.stairBottomClearance = newSuggestions.estimated_clearance_at_bottom_cm >= 70 ? "Y" : "N";

        // ── Hallway ──────────────────────────────────────────────────────────
        if (newSuggestions.width_head_on_estimate_cm && !formData.hallwayWidthHeadOn)
          updates.hallwayWidthHeadOn = String(newSuggestions.width_head_on_estimate_cm);
        if (newSuggestions.width_turn_estimate_cm && !formData.hallwayWidthTurn)
          updates.hallwayWidthTurn = String(newSuggestions.width_turn_estimate_cm);
        if (newSuggestions.wheelchair_storage_visible !== undefined && !formData.wheelchairStoragePresent)
          updates.wheelchairStoragePresent = newSuggestions.wheelchair_storage_visible ? "Y" : "N";
        if (newSuggestions.wheelchair_storage_estimate_length_cm && !formData.wheelchairStorageLengthCm)
          updates.wheelchairStorageLengthCm = String(newSuggestions.wheelchair_storage_estimate_length_cm);
        if (newSuggestions.wheelchair_storage_estimate_width_cm && !formData.wheelchairStorageWidthCm)
          updates.wheelchairStorageWidthCm = String(newSuggestions.wheelchair_storage_estimate_width_cm);

        // ── Garden ───────────────────────────────────────────────────────────
        if (newSuggestions.step_count !== undefined && !formData.balconyStepCount)
          updates.balconyStepCount = String(newSuggestions.step_count);

        // ── Smart defaults: "not detected = No/N/0" ──────────────────────────
        // Only apply if floor plan has not already set these values
        const absoluteDefaults: Record<string, string> = {
          gardenAccess: "No",
          balconyPresent: "No",
          parkingPresent: "No",
          communalDoorPresent: "N",
          propertyRampPresent: "N",
          communalLiftCount: "0",
          wheelchairStoragePresent: "N",
          separateToiletPresent: "N",
          secondExitStepCount: "0",
          balconyStepCount: "0",
          communalStepCount: "0",
        };
        Object.entries(absoluteDefaults).forEach(([key, val]) => {
          if (!formData[key] && !updates[key]) updates[key] = val;
        });

        // Apply updates
        Object.entries(updates).forEach(([key, val]) => {
          handleUpdateField(key, val);
        });
      } else {
        toast.error("Analysis failed. Please try again.");
      }
    } catch (e) {
      console.error("Batch analysis error:", e);
      toast.error("An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isNextDisabled = () => {
    if (isProcessing || isAnalyzing) return true;
    if (step === 1)
      return !formData.fullName || !formData.street || !formData.postcode;
    // Step 2 (Section B) has no required fields
    if (step === 3) return !formData.floorPlan && !formData.hasNoFloorPlan;
    if (step === 4)
      return (formData.photos || []).length < 1 || !step3AnalysisComplete; // Require photos AND analysis
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[1000]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="w-full max-w-[780px] h-[85vh] bg-white/95 rounded-[20px] flex flex-col overflow-hidden shadow-2xl border border-white/70"
      >
        {/* Header Section */}
        <ProgressBar currentStep={step} steps={steps} />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <ClientInfoStep
                key="s1"
                formData={formData}
                handleUpdateField={handleUpdateField}
              />
            )}
            {step === 2 && (
              <MultiplePropertiesStep
                key="s2"
                formData={formData}
                handleUpdateField={handleUpdateField}
              />
            )}
            {step === 3 && (
              <FloorPlanStep
                key="s3"
                formData={formData}
                handleUpdateField={handleUpdateField}
                handlePhotoUpload={handlePhotoUpload}
                isAnalyzing={isAnalyzing}
                floorPlanAnalysis={floorPlanAnalysis}
              />
            )}
            {step === 4 && (
              <SmartCaptureStep
                key="s4"
                formData={formData}
                handleUpdateField={handleUpdateField}
                handlePhotoUpload={handlePhotoUpload}
                isProcessing={isProcessing}
                processingCategory={processingCategory}
                validationErrors={validationErrors}
                onClearValidationError={(catId) =>
                  setValidationErrors((prev) => {
                    const next = { ...prev };
                    delete next[catId];
                    return next;
                  })
                }
                isAnalyzing={isAnalyzing}
                analysisComplete={step3AnalysisComplete}
                categoryResults={categoryResults}
                onPhotosChanged={() => {
                  setStep3AnalysisComplete(false);
                  setCategoryResults({});
                }}
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
                aiSuggestions={aiSuggestions}
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
        <div className="py-3 px-5 bg-white border-t border-border flex justify-between items-center">
          <button onClick={onClose} className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center cursor-pointer text-slate-500">
            <X size={20} />
          </button>

          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="py-2.5 px-5 bg-white text-text-main rounded-xl border border-slate-200 font-bold text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft size={20} /> Back
              </button>
            )}

            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className={cn(
                "py-2.5 px-5 bg-white rounded-xl border font-bold text-sm flex items-center gap-1.5",
                "border-primary text-primary",
                isSavingDraft && "opacity-70 cursor-not-allowed"
              )}
            >
              {isSavingDraft ? "Saving…" : "Save Progress"}
            </button>

            {step === 4 && (
              <button
                onClick={startStep3BatchAnalysis}
                disabled={
                  (formData.photos || []).length < 1 ||
                  isAnalyzing ||
                  isProcessing ||
                  step3AnalysisComplete
                }
                className={cn(
                  "py-2.5 px-5 rounded-xl border font-bold text-sm flex items-center gap-1.5",
                  step3AnalysisComplete && "border-green-600 text-green-600 bg-green-50 cursor-not-allowed",
                  isAnalyzing && !step3AnalysisComplete && "border-primary text-primary bg-white cursor-not-allowed",
                  ((formData.photos || []).length < 1 || isProcessing) && !step3AnalysisComplete && !isAnalyzing && "bg-slate-300 border-slate-300 text-white cursor-not-allowed opacity-60 shadow-none",
                  !step3AnalysisComplete && !isAnalyzing && (formData.photos || []).length >= 1 && !isProcessing && "border-primary text-primary font-extrabold bg-white"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    Analyzing...
                  </>
                ) : step3AnalysisComplete ? (
                  <>
                    <CheckCircle size={16} />
                    Analyzed
                  </>
                ) : (
                  <>
                    <Camera size={16} />
                    Analyze Photos
                  </>
                )}
              </button>
            )}

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
              className={cn(
                "py-2.5 px-5 rounded-xl border-none font-bold text-sm flex items-center gap-1.5 transition-all",
                isNextDisabled()
                  ? "bg-slate-300 text-white cursor-not-allowed opacity-60 shadow-none"
                  : "bg-primary text-white cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.3)]"
              )}
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
      status: "Review",
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

export default AssessmentWizard;
