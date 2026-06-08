import React, { useState, useEffect, useRef } from "react";
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
  renderAnnotatedFloorPlan,
} from "@/lib/utils/FloorPlanUtils";
import type { DetectionResponse } from "@/lib/detection/types";
import {
  analyzeCategoryPhoto,
  analyzeAllCategoryPhotos,
  compressBase64Image,
  ImageAnalysisResult,
  BatchAnalysisResult,
  normalizeReportFillPayload,
  urlToBase64,
} from "@/lib/utils/ImageAnalysisUtils";
import { deriveInferredAnswersFromAssessment } from "@/lib/engine/prompts";
import { uploadBase64ToStorage, uploadFileToStorage } from "@/lib/surveys/upload";
import { convertHeicToJpegIfNeeded } from "@/lib/utils/imageUtils";
import { renderPdfFirstPageToJpeg } from "@/lib/utils/pdfToImage";
import { saveSurveyClient } from "@/lib/surveys/client";
import {
  deriveBathroomLocation,
  normalizeBathingType,
  normalizeCommunalLiftOption,
  normalizeEntranceLevel,
  normalizeBathroomLocation,
  normalizeHandrailSide,
  normalizeInternalLiftOption,
  normalizePropertyType,
  normalizeSecondExitLocation,
  normalizeStairGeometry,
  normalizeToiletType,
} from "@/lib/utils/normalizeAiOutputs";
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

const STEPS = [
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
  communalLifts: "",
  internalLift: "",
  bedrooms: 0,
  bedSpaces: 1,
  photos: [],
  categoryPhotos: {},
  floorPlan: null,
  floorPlanApproved: false,
  floorPlanIsPdf: false,
  floorPlanName: "",
  floorPlanOpenUrl: null as string | null,
  floorPlanPreviewUrl: null as string | null,
  hasNoFloorPlan: false,
  // Property-search (evidence harvester) linkage
  propertyId: null as string | null,
  streetViewUrl: null as string | null,
  propertyLat: null as number | null,
  propertyLng: null as number | null,
  evidenceLoaded: false,
  floorPlanSource: null as string | null, // 'upload' | 'ai-search' | null
  entranceSeeded: false,
  bathroomLocation: "",
  secondExit: "",
  secondExitLocation: "",
  hazards: "",
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
  const [floorPlanDetection, setFloorPlanDetection] =
    useState<DetectionResponse | null>(null);
  const [formData, setFormData] = useState<any>(initialFormData);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [processingCategory, setProcessingCategory] = useState<string | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Floor plan is held in memory during the wizard and only uploaded at save.
  // floorPlanFileRef: the original file (image OR pdf) to persist at save time.
  // floorPlanImageRef: a raster image (base64) for analysis annotation — for PDFs
  // this is the rendered first page (the PDF itself can't be drawn on a canvas).
  const floorPlanFileRef = useRef<File | null>(null);
  const floorPlanImageRef = useRef<string | null>(null);
  // Caches the storage URLs after the original file (and, for PDFs, the rendered
  // first-page preview image) are uploaded at save time.
  const floorPlanUploadedUrlRef = useRef<string | null>(null);
  const floorPlanPreviewUrlRef = useRef<string | null>(null);

  const steps = STEPS;
  const totalSteps = steps.length;
  const analysisStepIndex = totalSteps;

  const normalizeFacilityToken = (raw: unknown): string | null => {
    const text = String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/[_/()-]+/g, " ")
      .replace(/\s+/g, " ");
    if (!text) return null;
    if (
      text.includes("master bedroom") ||
      text.includes("bedroom 1") ||
      text === "bed 1"
    )
      return "bed_1";
    if (text.includes("bedroom 2") || text === "bed 2") return "bed_2";
    if (text.includes("bedroom 3") || text === "bed 3") return "bed_3";
    if (text.includes("en suite")) return "combined_bath_toilet";
    if (text.includes("combined") && text.includes("bath"))
      return "combined_bath_toilet";
    if (text.includes("bathroom")) return "bathroom_no_toilet";
    if (
      text.includes("separate toilet") ||
      text.includes("separate wc") ||
      text === "wc"
    )
      return "separate_toilet";
    if (text.includes("living") || text.includes("dining"))
      return "living_room";
    if (text.includes("kitchen")) return "kitchen";
    if (text.includes("other")) return "other";
    return null;
  };

  const normalizeFacilitiesList = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    const normalized = value
      .map(normalizeFacilityToken)
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    return Array.from(new Set(normalized));
  };

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

  // Initialize/Reset
  useEffect(() => {
    if (isOpen) {
      // Always clear transient analysis/runtime state when opening wizard
      setStep3AnalysisComplete(false);
      setCategoryResults({});
      setValidationErrors({});
      setAiSuggestions({});
      setFloorPlanAnalysis(null);
      setProcessingCategory(null);
      setIsAnalyzing(false);
      setIsProcessing(false);
      if (initialData) {
        // Map evidence to photos for wizard consistency
        const data = { ...initialData } as any;
        if (data.evidence && !data.photos) {
          data.photos = data.evidence;
        }
        if (data.floorPlan && data.floorPlanApproved === undefined) {
          data.floorPlanApproved = true;
        }
        setFormData({ ...initialFormData, ...data });
        if (data.aiSuggestions && typeof data.aiSuggestions === "object") {
          setAiSuggestions(data.aiSuggestions);
        }
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

  const handleClearFloorPlan = () => {
    handleUpdateField("floorPlan", null);
    handleUpdateField("floorPlanApproved", false);
    handleUpdateField("floorPlanSource", null);
    handleUpdateField("floorPlanIsPdf", false);
    handleUpdateField("floorPlanName", "");
    handleUpdateField("floorPlanOpenUrl", null);
    handleUpdateField("floorPlanPreviewUrl", null);
    floorPlanFileRef.current = null;
    floorPlanImageRef.current = null;
    floorPlanUploadedUrlRef.current = null;
    floorPlanPreviewUrlRef.current = null;
    setFloorPlanAnalysis(null);
    setFloorPlanDetection(null);
  };

  const toBase64 = (file: File | Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  /**
   * Store a floor-plan File (from manual upload OR a selected planning document),
   * run the Gemini + detection pipeline, and auto-fill the structural fields.
   * The original file is held in a ref and only uploaded to storage at save time.
   * PDFs are rendered to an image (first page) for analysis. Shared by
   * handlePhotoUpload (Step 3) and handleSelectPlanningDoc (AI search).
   */
  const processFloorPlanFile = async (
    rawFile: File,
    opts?: { openUrl?: string; source?: "upload" | "ai-search" },
  ) => {
    setIsProcessing(true);
    try {
      const isPdf = (rawFile.type || "").includes("pdf");
      // The image actually analysed (rendered first page for PDFs).
      let imageFile: File;
      if (isPdf) {
        imageFile = await renderPdfFirstPageToJpeg(rawFile);
      } else {
        imageFile = await convertHeicToJpegIfNeeded(rawFile);
      }

      const imageBase64 = await toBase64(imageFile);
      floorPlanFileRef.current = rawFile; // original, uploaded at save
      floorPlanImageRef.current = imageBase64; // raster for annotation/preview
      floorPlanUploadedUrlRef.current = null; // new file → re-upload at save
      floorPlanPreviewUrlRef.current = null;

      handleUpdateField("floorPlanIsPdf", isPdf);
      handleUpdateField(
        "floorPlanName",
        rawFile.name || (isPdf ? "floor-plan.pdf" : "floor-plan.jpg"),
      );
      // Set the source now (with the preview fields) so the preview renders
      // before analysis — the AI-search panel only shows it when source==='ai-search'.
      handleUpdateField("floorPlanSource", opts?.source ?? "upload");
      // Original kept for "Open"/download; rendered image used for the preview.
      handleUpdateField("floorPlanOpenUrl", opts?.openUrl ?? URL.createObjectURL(rawFile));
      handleUpdateField("floorPlan", imageBase64);

      // Show the preview first: let the browser paint before the (slower, and
      // sometimes rate-limited) analysis request fires.
      await new Promise<void>((resolve) =>
        typeof requestAnimationFrame !== "undefined"
          ? requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          : setTimeout(resolve, 0),
      );
      setIsAnalyzing(true);

      // Analyse with the raster image (Gemini + detection only handle images).
      try {
        const detected = await analyzeFloorPlan(imageFile);
        const result = detected?.analysis ?? null;
        if (detected && result) {
          setFloorPlanAnalysis(result);
          setFloorPlanDetection(detected.raw);
          handleUpdateField("floorPlanApproved", result.is_floor_plan !== false);
          if (result.bedroom_count?.value !== undefined)
            handleUpdateField("bedrooms", Number(result.bedroom_count.value));
          if (result.section_measurements) {
            const m = result.section_measurements;
            const setWidth = (field: string, cm: number | null | undefined) => {
              if (cm !== null && cm !== undefined && Number.isFinite(Number(cm))) {
                handleUpdateField(field, String(cm));
              }
            };
            setWidth("doorLivingWidth", m.door_opening_width_living_room_cm);
            setWidth("doorKitchenWidth", m.door_opening_width_kitchen_cm);
            setWidth("doorBed1Width", m.door_opening_width_bed_1_cm);
            setWidth("doorBed2Width", m.door_opening_width_bed_2_cm);
            setWidth("doorBed3Width", m.door_opening_width_bed_3_cm);
            setWidth("doorBathroomWidth", m.door_opening_width_bathroom_cm);
            setWidth("doorToiletWidth", m.door_opening_width_separate_toilet_cm);
            setWidth("doorBalconyWidth", m.door_opening_width_balcony_cm);
            setWidth("communalDoorWidth", m.communal_front_door_opening_width_cm);
            setWidth("propertyDoorWidth", m.property_front_door_opening_width_cm);
            setWidth("communalLiftDoorWidth", m.communal_lift_door_opening_width_cm);
            setWidth("secondExitWidth", m.second_exit_door_opening_width_cm);
          }
          if (result.entrance_level) {
            const normalizedEntrance = normalizeEntranceLevel(
              result.entrance_level.value,
            );
            if (normalizedEntrance)
              handleUpdateField("entranceLevel", normalizedEntrance);
          }
          if (result.internal_stairs)
            handleUpdateField(
              "internalStairs",
              result.internal_stairs.detected ? "Yes" : "No",
            );
          if (result.floor_level_number)
            handleUpdateField(
              "floorLevelNumber",
              String(result.floor_level_number),
            );
          if (result.stair_geometry) {
            const normalizedStairGeometry = normalizeStairGeometry(
              result.stair_geometry,
            );
            if (normalizedStairGeometry)
              handleUpdateField("internalStairsType", normalizedStairGeometry);
          }
          if (result.external_access) {
            handleUpdateField(
              "gardenAccess",
              result.external_access.garden_present ? "Yes" : "No",
            );
            handleUpdateField(
              "balconyPresent",
              result.external_access.balcony_present ? "Yes" : "No",
            );
            handleUpdateField(
              "parkingPresent",
              result.external_access.parking_present ? "Yes" : "No",
            );
          }
          if (result.second_exit)
            handleUpdateField(
              "secondExit",
              result.second_exit.detected ? "Yes" : "No",
            );
          if (result.lift?.detected !== undefined) {
            const normalizedLift = normalizeCommunalLiftOption(
              result.lift.detected,
            );
            if (normalizedLift) handleUpdateField("communalLifts", normalizedLift);
          }
          if (result.communal) {
            handleUpdateField(
              "communalDoorPresent",
              result.communal.communal_door_present ? "Y" : "N",
            );
            handleUpdateField(
              "communalLiftCount",
              String(result.communal.communal_lift_count ?? 0),
            );
          }
          if (result.facilities_per_floor) {
            const normalizedAccess = normalizeFacilitiesList(
              result.facilities_per_floor.access_level ?? [],
            );
            const normalizedAbove = normalizeFacilitiesList(
              result.facilities_per_floor.above ?? [],
            );
            const normalizedBelow = normalizeFacilitiesList(
              result.facilities_per_floor.below ?? [],
            );
            handleUpdateField("facilitiesAccessLevel", normalizedAccess);
            handleUpdateField("facilitiesAboveLevel", normalizedAbove);
            handleUpdateField("facilitiesBelowLevel", normalizedBelow);
            const derivedBathroomLocation = deriveBathroomLocation({
              accessFacilities: result.facilities_per_floor.access_level ?? [],
              aboveFacilities: result.facilities_per_floor.above ?? [],
              belowFacilities: result.facilities_per_floor.below ?? [],
              floorLevelNumber: result.floor_level_number,
            });
            if (derivedBathroomLocation)
              handleUpdateField("bathroomLocation", derivedBathroomLocation);
          }
        } else {
          setFloorPlanAnalysis(null);
          setFloorPlanDetection(null);
          handleUpdateField("floorPlanApproved", false);
          toast.warning("Detection service unavailable — fill fields manually.");
        }
      } catch (err) {
        console.error("Floor plan analysis error:", err);
        setFloorPlanAnalysis(null);
        setFloorPlanDetection(null);
        handleUpdateField("floorPlanApproved", false);
        toast.warning("Detection service unavailable — fill fields manually.");
      }
    } catch (err) {
      console.error("Floor plan processing error:", err);
      toast.error("Could not process this file. Please try another.");
    } finally {
      setIsProcessing(false);
      setIsAnalyzing(false);
    }
  };

  /**
   * Select a council planning document as the floor plan: fetch it through the
   * authenticated proxy, wrap it in a File, and run the standard detection pipeline.
   */
  const handleSelectPlanningDoc = async (sourceId: string) => {
    try {
      const res = await fetch(
        `/api/evidence-harvester/floorplan-file/${sourceId}`,
      );
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const type = blob.type || "application/pdf";
      const ext = type.includes("pdf") ? "pdf" : "jpg";
      const file = new File([blob], `planning-floorplan.${ext}`, { type });
      await processFloorPlanFile(file, {
        openUrl: `/api/evidence-harvester/floorplan-file/${sourceId}`,
        source: "ai-search",
      });
    } catch {
      toast.warning(
        "Couldn't load that document automatically — open it in a new tab and upload it instead.",
      );
    }
  };

  // Prepare the "Main Entrance" photo from the property's Street View image as
  // soon as the address is selected in Step 1 (streetViewUrl becomes available) —
  // so it's ready for the image-analysis step, independent of step navigation.
  // Runs once; never overwrites a user replacement.
  useEffect(() => {
    if (!formData.streetViewUrl || formData.entranceSeeded) return;
    if (formData.categoryPhotos?.entrance?.length) return;
    let cancelled = false;
    (async () => {
      let stableUrl: string = formData.streetViewUrl;
      try {
        // The signed Street View URL expires in ~1h — persist a stable copy so
        // batch analysis later in the step can still fetch it.
        const base64 = await urlToBase64(formData.streetViewUrl);
        if (base64) {
          try {
            const compressed = await compressBase64Image(base64);
            stableUrl = await uploadBase64ToStorage(
              compressed,
              `wizard/streetview-${Date.now()}.jpg`,
            );
          } catch {
            stableUrl = base64;
          }
        }
      } catch {
        /* fall back to the raw signed URL */
      }
      if (cancelled) return;
      const updated = {
        ...(formData.categoryPhotos || {}),
        entrance: [stableUrl],
      };
      handleUpdateField("categoryPhotos", updated);
      handleUpdateField("photos", Object.values(updated).flat());
      handleUpdateField("entranceSeeded", true);
      handleStep3PhotosChanged(updated);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.streetViewUrl]);

  /**
   * Upload the original floor-plan file to storage — deferred until save. Returns
   * the stored URL (or the existing URL / null). Idempotent across re-saves.
   */
  const persistFloorPlan = async (): Promise<{
    url: string | null;
    previewUrl: string | null;
  }> => {
    // Already uploaded this session (e.g. a prior draft save) → reuse the URLs.
    if (floorPlanUploadedUrlRef.current) {
      return {
        url: floorPlanUploadedUrlRef.current,
        previewUrl: floorPlanPreviewUrlRef.current,
      };
    }
    const file = floorPlanFileRef.current;
    if (file) {
      const isPdf = (file.type || "").includes("pdf");
      const ext = isPdf ? "pdf" : "jpg";
      try {
        const url = await uploadFileToStorage(
          file,
          `survey/${formData.id || "new"}/floorplan-${Date.now()}.${ext}`,
        );
        // For PDFs, also persist the rendered first-page image so the report and
        // case overview can show an image preview (a PDF can't render in <img>).
        let previewUrl: string | null = null;
        if (isPdf && floorPlanImageRef.current) {
          try {
            previewUrl = await uploadBase64ToStorage(
              floorPlanImageRef.current,
              `survey/${formData.id || "new"}/floorplan-preview-${Date.now()}.jpg`,
            );
          } catch (e) {
            console.warn("Floor plan preview upload failed:", e);
          }
        }
        floorPlanUploadedUrlRef.current = url;
        floorPlanPreviewUrlRef.current = previewUrl;
        handleUpdateField("floorPlanOpenUrl", url);
        return { url, previewUrl };
      } catch (err) {
        console.warn("Floor plan upload failed:", err);
      }
    }
    // No original held (e.g. reopened draft) or upload failed: keep whatever the
    // form has (a stored URL stays as-is; a base64 image is uploaded by saveSurveyClient).
    const current = formData.floorPlan;
    return {
      url: typeof current === "string" ? current : null,
      previewUrl: formData.floorPlanPreviewUrl ?? null,
    };
  };

  const buildFloorPlanDetectionPayload = async () => {
    if (!floorPlanDetection) return null;
    // Annotate the raster image (a PDF floorPlan URL can't be drawn on a canvas).
    const src = floorPlanImageRef.current || formData.floorPlan;
    if (!src || typeof src !== "string") return floorPlanDetection;
    try {
      const annotated = await renderAnnotatedFloorPlan(src, floorPlanDetection);
      const path = `survey/${formData.id || "new"}/annotated-${Date.now()}.jpg`;
      const annotatedUrl = await uploadBase64ToStorage(
        annotated,
        path,
        "floor-plan-detections",
      );
      return { ...floorPlanDetection, annotated_image_url: annotatedUrl };
    } catch (err) {
      console.warn("Annotated floor plan upload failed:", err);
      return floorPlanDetection;
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const { url: floorPlanUrl, previewUrl: floorPlanPreviewUrl } =
        await persistFloorPlan();
      const detectionPayload = await buildFloorPlanDetectionPayload();
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
        thumbnail: (formData.photos && formData.photos[0]) || "",
        evidence: formData.photos || [],
        description: `AHR Assessment for ${formData.fullName || "Client"}`,
        observations: [],
        mlData: {
          imageCount: formData.photos?.length || 0,
          floorPlanAvailable: !!floorPlanUrl,
          wizardData: { ...formData, floorPlan: floorPlanUrl, floorPlanPreviewUrl },
          aiReport: formData.aiReport,
          floorPlanDetection: detectionPayload,
          propertyId: formData.propertyId ?? null,
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
    // Note: for step 3 (floor plan) processFloorPlanFile manages the analyzing
    // state itself — it shows the preview first, then starts the API call.

    try {
      const files = await Promise.all(
        rawFiles.map((f) => convertHeicToJpegIfNeeded(f)),
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
        await processFloorPlanFile(files[0], { source: "upload" });
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

        handleStep3PhotosChanged(updatedCategoryPhotos);
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

  const startStep3BatchAnalysis = async (
    overrideCategoryPhotos?: Record<string, string[]>,
  ) => {
    const categoryPhotos =
      overrideCategoryPhotos || formData.categoryPhotos || {};
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
        // Normalize AI values so they match exact wizard option labels
        const normalizedPropertyType = normalizePropertyType(
          newSuggestions.property_type,
        );
        if (normalizedPropertyType) {
          newSuggestions.property_type = normalizedPropertyType;
        }
        const normalizedEntrance = normalizeEntranceLevel(
          newSuggestions.entrance_level,
        );
        if (normalizedEntrance) {
          newSuggestions.entrance_level = normalizedEntrance;
        }
        const normalizedBathingType = normalizeBathingType(
          newSuggestions.bathing_type,
        );
        if (normalizedBathingType) {
          newSuggestions.bathing_type = normalizedBathingType;
        }
        const normalizedToiletType = normalizeToiletType(
          newSuggestions.toilet_type,
        );
        if (normalizedToiletType) {
          newSuggestions.toilet_type = normalizedToiletType;
        }
        const normalizedBathroomLocation = normalizeBathroomLocation(
          newSuggestions.bathroom_location,
        );
        if (normalizedBathroomLocation) {
          newSuggestions.bathroom_location = normalizedBathroomLocation;
        }
        const normalizedStairGeometry = normalizeStairGeometry(
          newSuggestions.stair_type,
        );
        if (normalizedStairGeometry) {
          newSuggestions.stair_type = normalizedStairGeometry;
        }
        const normalizedHandrails = normalizeHandrailSide(
          newSuggestions.handrails,
        );
        if (normalizedHandrails) {
          newSuggestions.handrails = normalizedHandrails;
        }
        const normalizedSecondExitLocation = normalizeSecondExitLocation(
          newSuggestions.second_exit_access_to_street,
        );
        if (normalizedSecondExitLocation) {
          newSuggestions.second_exit_location = normalizedSecondExitLocation;
        }
        const normalizedInternalLift = normalizeInternalLiftOption({
          stairLift: newSuggestions.stair_lift_present,
          throughFloorLift: newSuggestions.through_floor_lift_present,
          internalLiftRaw: newSuggestions.internal_lift,
        });
        newSuggestions.internal_lift_option = normalizedInternalLift;
        const normalizedCommunalLift = normalizeCommunalLiftOption(
          newSuggestions.communal_lift_present,
          newSuggestions.communal_lift_type,
        );
        if (normalizedCommunalLift) {
          newSuggestions.communal_lifts_option = normalizedCommunalLift;
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
          toast.success("All photos analysed successfully!");
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
        if (newSuggestions.bathing_type && !formData.bathingType) {
          const normalized = normalizeBathingType(newSuggestions.bathing_type);
          if (normalized) updates.bathingType = normalized;
        }
        if (newSuggestions.toilet_type && !formData.toiletType) {
          const normalized = normalizeToiletType(newSuggestions.toilet_type);
          if (normalized) updates.toiletType = normalized;
        }
        if (
          newSuggestions.bedroom_count !== undefined &&
          Number.isFinite(Number(newSuggestions.bedroom_count)) &&
          !formData.bedrooms
        ) {
          updates.bedrooms = Number(newSuggestions.bedroom_count);
        }
        if (
          newSuggestions.turning_circle !== undefined &&
          !formData.bathroomTurning150
        )
          updates.bathroomTurning150 = newSuggestions.turning_circle
            ? "Y"
            : "N";
        if (newSuggestions.length_estimate_cm && !formData.bathroomLengthCm)
          updates.bathroomLengthCm = String(newSuggestions.length_estimate_cm);
        if (newSuggestions.width_estimate_cm && !formData.bathroomWidthCm)
          updates.bathroomWidthCm = String(newSuggestions.width_estimate_cm);
        if (
          newSuggestions.lateral_space_estimate_cm &&
          !formData.bathroomLateralSpace
        )
          updates.bathroomLateralSpace = String(
            newSuggestions.lateral_space_estimate_cm,
          );
        if (
          newSuggestions.has_separate_toilet !== undefined &&
          !formData.separateToiletPresent
        )
          updates.separateToiletPresent = newSuggestions.has_separate_toilet
            ? "Y"
            : "N";

        // ── Kitchen additional ───────────────────────────────────────────────
        if (
          newSuggestions.turning_circle_170x140 !== undefined &&
          !formData.kitchenTurning170
        )
          updates.kitchenTurning170 = newSuggestions.turning_circle_170x140
            ? "Y"
            : "N";
        if (
          newSuggestions.accessible_layout !== undefined &&
          !formData.kitchenAccessibleUnits
        )
          updates.kitchenAccessibleUnits = newSuggestions.accessible_layout
            ? "Y"
            : "N";
        if (
          newSuggestions.separate_from_living !== undefined &&
          !formData.kitchenSeparateLiving
        )
          updates.kitchenSeparateLiving = newSuggestions.separate_from_living
            ? "Y"
            : "N";

        // ── Entrance ─────────────────────────────────────────────────────────
        if (newSuggestions.property_type && !formData.propertyType) {
          const normalized = normalizePropertyType(
            newSuggestions.property_type,
          );
          if (normalized) updates.propertyType = normalized;
        }
        if (newSuggestions.entrance_level && !formData.entranceLevel) {
          const normalized = normalizeEntranceLevel(
            newSuggestions.entrance_level,
          );
          if (normalized) updates.entranceLevel = normalized;
        }
        if (
          (newSuggestions.communal_lifts_option ||
            newSuggestions.communal_lift_present !== undefined) &&
          !formData.communalLifts
        ) {
          const normalized =
            newSuggestions.communal_lifts_option ||
            normalizeCommunalLiftOption(
              newSuggestions.communal_lift_present,
              newSuggestions.communal_lift_type,
            );
          if (normalized) updates.communalLifts = normalized;
        }
        if (
          newSuggestions.communal_entrance !== undefined &&
          !formData.communalDoorPresent
        )
          updates.communalDoorPresent = newSuggestions.communal_entrance
            ? "Y"
            : "N";
        if (
          newSuggestions.communal_front_door_present !== undefined &&
          !formData.communalDoorPresent
        ) {
          updates.communalDoorPresent =
            newSuggestions.communal_front_door_present ? "Y" : "N";
        }
        if (
          newSuggestions.property_front_door_present !== undefined &&
          !formData.propertyDoorPresent
        ) {
          updates.propertyDoorPresent =
            !!newSuggestions.property_front_door_present;
        }
        if (
          newSuggestions.communal_front_door_steps_count !== undefined &&
          !formData.communalStepCount
        )
          updates.communalStepCount = String(
            newSuggestions.communal_front_door_steps_count,
          );
        if (
          newSuggestions.property_front_door_steps_count !== undefined &&
          !formData.propertyDoorSteps
        )
          updates.propertyDoorSteps = String(
            newSuggestions.property_front_door_steps_count,
          );
        if (
          newSuggestions.communal_front_door_threshold_height_cm !==
            undefined &&
          !formData.communalDoorThreshold
        )
          updates.communalDoorThreshold = String(
            newSuggestions.communal_front_door_threshold_height_cm,
          );
        if (
          newSuggestions.property_front_door_threshold_height_cm !==
            undefined &&
          !formData.propertyDoorThreshold
        )
          updates.propertyDoorThreshold = String(
            newSuggestions.property_front_door_threshold_height_cm,
          );
        if (
          newSuggestions.communal_front_door_opening_width_cm !== undefined &&
          !formData.communalDoorWidth
        )
          updates.communalDoorWidth = String(
            newSuggestions.communal_front_door_opening_width_cm,
          );
        if (
          newSuggestions.property_front_door_opening_width_cm !== undefined &&
          !formData.propertyDoorWidth
        )
          updates.propertyDoorWidth = String(
            newSuggestions.property_front_door_opening_width_cm,
          );
        if (
          newSuggestions.communal_lift_internal_width_cm !== undefined &&
          !formData.communalLiftWidth
        )
          updates.communalLiftWidth = String(
            newSuggestions.communal_lift_internal_width_cm,
          );
        if (
          newSuggestions.communal_lift_internal_depth_cm !== undefined &&
          !formData.communalLiftDepth
        )
          updates.communalLiftDepth = String(
            newSuggestions.communal_lift_internal_depth_cm,
          );
        if (
          newSuggestions.communal_lift_door_opening_width_cm !== undefined &&
          !formData.communalLiftDoorWidth
        )
          updates.communalLiftDoorWidth = String(
            newSuggestions.communal_lift_door_opening_width_cm,
          );
        if (
          newSuggestions.ramp_present !== undefined &&
          !formData.propertyRampPresent
        )
          updates.propertyRampPresent = newSuggestions.ramp_present ? "Y" : "N";
        if (
          newSuggestions.through_floor_lift_present !== undefined &&
          !formData.throughFloorLift
        )
          updates.throughFloorLift =
            !!newSuggestions.through_floor_lift_present;
        if (
          newSuggestions.step_lift_present !== undefined &&
          !formData.stepLift
        )
          updates.stepLift = !!newSuggestions.step_lift_present;
        if (
          newSuggestions.platform_stair_lift_present !== undefined &&
          !formData.platformLift
        ) {
          updates.platformLift = !!newSuggestions.platform_stair_lift_present;
        }
        if (
          newSuggestions.level_access_shower_present !== undefined &&
          !formData.levelAccessShower
        ) {
          updates.levelAccessShower =
            !!newSuggestions.level_access_shower_present;
        }
        if (
          newSuggestions.ceiling_track_hoist_present !== undefined &&
          !formData.ceilingTrackHoist
        ) {
          updates.ceilingTrackHoist =
            !!newSuggestions.ceiling_track_hoist_present;
        }
        if (
          newSuggestions.stair_lift_present !== undefined &&
          !formData.stairLift
        )
          updates.stairLift = !!newSuggestions.stair_lift_present;
        if (
          newSuggestions.through_floor_lift_internal_width_cm !== undefined &&
          !formData.throughFloorLiftWidth
        ) {
          updates.throughFloorLiftWidth = String(
            newSuggestions.through_floor_lift_internal_width_cm,
          );
        }
        if (
          newSuggestions.through_floor_lift_internal_depth_cm !== undefined &&
          !formData.throughFloorLiftDepth
        ) {
          updates.throughFloorLiftDepth = String(
            newSuggestions.through_floor_lift_internal_depth_cm,
          );
        }

        // ── Stairs ───────────────────────────────────────────────────────────
        if (newSuggestions.has_stairs !== undefined && !formData.internalStairs)
          updates.internalStairs = newSuggestions.has_stairs ? "Yes" : "No";
        if (newSuggestions.stair_type && !formData.internalStairsType) {
          const normalized = normalizeStairGeometry(newSuggestions.stair_type);
          if (normalized) updates.internalStairsType = normalized;
        }
        if (newSuggestions.handrails && !formData.internalHandrails) {
          const normalized = normalizeHandrailSide(newSuggestions.handrails);
          if (normalized) updates.internalHandrails = normalized;
        }
        if (
          (newSuggestions.internal_lift_option ||
            newSuggestions.stair_lift_present !== undefined ||
            newSuggestions.through_floor_lift_present !== undefined) &&
          !formData.internalLift
        ) {
          updates.internalLift =
            newSuggestions.internal_lift_option ||
            normalizeInternalLiftOption({
              stairLift: newSuggestions.stair_lift_present,
              throughFloorLift: newSuggestions.through_floor_lift_present,
              internalLiftRaw: newSuggestions.internal_lift,
            });
        }
        if (newSuggestions.estimated_stair_width_cm && !formData.stairWidth)
          updates.stairWidth = String(newSuggestions.estimated_stair_width_cm);
        if (newSuggestions.internal_stair_width_cm && !formData.stairWidth)
          updates.stairWidth = String(newSuggestions.internal_stair_width_cm);
        if (
          newSuggestions.internal_steps_count !== undefined &&
          !formData.internalStepsCount
        )
          updates.internalStepsCount = String(
            newSuggestions.internal_steps_count,
          );
        if (
          newSuggestions.internal_step_height_cm !== undefined &&
          !formData.internalStepHeight
        )
          updates.internalStepHeight = String(
            newSuggestions.internal_step_height_cm,
          );
        if (
          newSuggestions.estimated_clearance_at_bottom_cm !== undefined &&
          !formData.stairBottomClearance
        )
          updates.stairBottomClearance =
            newSuggestions.estimated_clearance_at_bottom_cm >= 70 ? "Y" : "N";

        // ── Hallway ──────────────────────────────────────────────────────────
        if (
          newSuggestions.width_head_on_estimate_cm &&
          !formData.hallwayWidthHeadOn
        )
          updates.hallwayWidthHeadOn = String(
            newSuggestions.width_head_on_estimate_cm,
          );
        if (newSuggestions.width_turn_estimate_cm && !formData.hallwayWidthTurn)
          updates.hallwayWidthTurn = String(
            newSuggestions.width_turn_estimate_cm,
          );
        if (
          newSuggestions.hallway_head_on_width_cm &&
          !formData.hallwayMinWidthHeadOn
        )
          updates.hallwayMinWidthHeadOn = String(
            newSuggestions.hallway_head_on_width_cm,
          );
        if (
          newSuggestions.hallway_turn_width_cm &&
          !formData.hallwayMinWidthTurn
        )
          updates.hallwayMinWidthTurn = String(
            newSuggestions.hallway_turn_width_cm,
          );
        if (
          newSuggestions.wheelchair_storage_visible !== undefined &&
          !formData.wheelchairStoragePresent
        )
          updates.wheelchairStoragePresent =
            newSuggestions.wheelchair_storage_visible ? "Y" : "N";
        if (
          newSuggestions.wheelchair_storage_estimate_length_cm &&
          !formData.wheelchairStorageLengthCm
        )
          updates.wheelchairStorageLengthCm = String(
            newSuggestions.wheelchair_storage_estimate_length_cm,
          );
        if (
          newSuggestions.wheelchair_storage_estimate_width_cm &&
          !formData.wheelchairStorageWidthCm
        )
          updates.wheelchairStorageWidthCm = String(
            newSuggestions.wheelchair_storage_estimate_width_cm,
          );

        // ── Garden ───────────────────────────────────────────────────────────
        if (
          newSuggestions.garden_steps_count !== undefined &&
          !formData.gardenSteps
        )
          updates.gardenSteps = String(newSuggestions.garden_steps_count);
        if (
          newSuggestions.balcony_steps_count !== undefined &&
          !formData.balconyStepCount
        )
          updates.balconyStepCount = String(newSuggestions.balcony_steps_count);

        // ── Second Exit / Section E / Door widths / Adaptability ────────────
        if (
          newSuggestions.second_exit_present !== undefined &&
          !formData.secondExitPresent
        )
          updates.secondExitPresent = newSuggestions.second_exit_present
            ? "Y"
            : "N";
        if (
          newSuggestions.second_exit_present !== undefined &&
          !formData.secondExit
        )
          updates.secondExit = newSuggestions.second_exit_present
            ? "Yes"
            : "No";
        if (
          newSuggestions.second_exit_access_to_street !== undefined &&
          !formData.secondExitAccessToStreet
        )
          updates.secondExitAccessToStreet =
            newSuggestions.second_exit_access_to_street ? "Y" : "N";
        if (
          newSuggestions.second_exit_access_to_street !== undefined &&
          !formData.secondExitLocation
        ) {
          const normalized = normalizeSecondExitLocation(
            newSuggestions.second_exit_access_to_street,
          );
          if (normalized) updates.secondExitLocation = normalized;
        }
        if (
          newSuggestions.second_exit_steps_count !== undefined &&
          !formData.secondExitSteps
        )
          updates.secondExitSteps = String(
            newSuggestions.second_exit_steps_count,
          );
        if (
          newSuggestions.second_exit_threshold_band &&
          !formData.secondExitThreshold
        )
          updates.secondExitThreshold = String(
            newSuggestions.second_exit_threshold_band,
          );
        if (
          newSuggestions.second_exit_door_opening_width_cm !== undefined &&
          !formData.secondExitWidth
        )
          updates.secondExitWidth = String(
            newSuggestions.second_exit_door_opening_width_cm,
          );
        const toFacilityList = (sectionValue: any): string[] => {
          if (!sectionValue) return [];
          if (Array.isArray(sectionValue)) {
            const normalizedArray = normalizeFacilitiesList(sectionValue);
            return normalizedArray;
          }
          if (typeof sectionValue === "object") {
            const normalized = Object.entries(sectionValue)
              .filter(([, enabled]) => enabled === true || enabled === "Y")
              .map(([name]) => normalizeFacilityToken(name))
              .filter((name): name is string => !!name);
            return normalized;
          }
          return [];
        };
        if (
          (formData.facilitiesAccessLevel || []).length === 0 &&
          newSuggestions.facilities_access_level
        ) {
          updates.facilitiesAccessLevel = toFacilityList(
            newSuggestions.facilities_access_level,
          );
        }
        if (
          (formData.facilitiesAboveLevel || []).length === 0 &&
          newSuggestions.facilities_above_level
        ) {
          updates.facilitiesAboveLevel = toFacilityList(
            newSuggestions.facilities_above_level,
          );
        }
        if (
          (formData.facilitiesBelowLevel || []).length === 0 &&
          newSuggestions.facilities_below_level
        ) {
          updates.facilitiesBelowLevel = toFacilityList(
            newSuggestions.facilities_below_level,
          );
        }
        if (newSuggestions.bathroom_location) {
          const normalized = normalizeBathroomLocation(
            newSuggestions.bathroom_location,
          );
          // AI analysed response is authoritative for bathroom location.
          if (normalized) updates.bathroomLocation = normalized;
        } else if (!formData.bathroomLocation) {
          const derivedLocation = deriveBathroomLocation({
            accessFacilities:
              updates.facilitiesAccessLevel ||
              formData.facilitiesAccessLevel ||
              [],
            aboveFacilities:
              updates.facilitiesAboveLevel ||
              formData.facilitiesAboveLevel ||
              [],
            belowFacilities:
              updates.facilitiesBelowLevel ||
              formData.facilitiesBelowLevel ||
              [],
            floorLevelNumber: formData.floorLevelNumber,
          });
          if (derivedLocation) {
            updates.bathroomLocation = derivedLocation;
          }
        }

        if (
          newSuggestions.separate_toilet_dimensions_width_cm &&
          !formData.toiletWidth
        )
          updates.toiletWidth = String(
            newSuggestions.separate_toilet_dimensions_width_cm,
          );
        if (
          newSuggestions.separate_toilet_dimensions_depth_cm &&
          !formData.toiletLength
        )
          updates.toiletLength = String(
            newSuggestions.separate_toilet_dimensions_depth_cm,
          );
        if (newSuggestions.separate_toilet_count && !formData.toiletCount)
          updates.toiletCount = String(newSuggestions.separate_toilet_count);
        if (
          newSuggestions.separate_toilet_lateral_space_cm &&
          !formData.toiletLateralSpace
        )
          updates.toiletLateralSpace = String(
            newSuggestions.separate_toilet_lateral_space_cm,
          );
        if (
          newSuggestions.bathroom_dimensions_width_cm &&
          !formData.bathroomWidth
        )
          updates.bathroomWidth = String(
            newSuggestions.bathroom_dimensions_width_cm,
          );
        if (
          newSuggestions.bathroom_dimensions_depth_cm &&
          !formData.bathroomLength
        )
          updates.bathroomLength = String(
            newSuggestions.bathroom_dimensions_depth_cm,
          );
        if (
          newSuggestions.bathroom_toilet_lateral_space_cm &&
          !formData.bathroomLateralSpace
        )
          updates.bathroomLateralSpace = String(
            newSuggestions.bathroom_toilet_lateral_space_cm,
          );

        if (
          newSuggestions.door_opening_width_living_room_cm &&
          !formData.doorLivingWidth
        )
          updates.doorLivingWidth = String(
            newSuggestions.door_opening_width_living_room_cm,
          );
        if (
          newSuggestions.door_opening_width_kitchen_cm &&
          !formData.doorKitchenWidth
        )
          updates.doorKitchenWidth = String(
            newSuggestions.door_opening_width_kitchen_cm,
          );
        if (
          newSuggestions.door_opening_width_bed_1_cm &&
          !formData.doorBed1Width
        )
          updates.doorBed1Width = String(
            newSuggestions.door_opening_width_bed_1_cm,
          );
        if (
          newSuggestions.door_opening_width_bed_2_cm &&
          !formData.doorBed2Width
        )
          updates.doorBed2Width = String(
            newSuggestions.door_opening_width_bed_2_cm,
          );
        if (
          newSuggestions.door_opening_width_bed_3_cm &&
          !formData.doorBed3Width
        )
          updates.doorBed3Width = String(
            newSuggestions.door_opening_width_bed_3_cm,
          );
        if (
          newSuggestions.door_opening_width_separate_toilet_cm &&
          !formData.doorToiletWidth
        )
          updates.doorToiletWidth = String(
            newSuggestions.door_opening_width_separate_toilet_cm,
          );
        if (
          newSuggestions.door_opening_width_bathroom_cm &&
          !formData.doorBathroomWidth
        )
          updates.doorBathroomWidth = String(
            newSuggestions.door_opening_width_bathroom_cm,
          );
        if (
          newSuggestions.door_opening_width_balcony_cm &&
          !formData.doorBalconyWidth
        )
          updates.doorBalconyWidth = String(
            newSuggestions.door_opening_width_balcony_cm,
          );

        if (
          newSuggestions.can_be_adapted !== undefined &&
          !formData.adaptableProperty
        )
          updates.adaptableProperty = newSuggestions.can_be_adapted ? "Y" : "N";
        if (
          newSuggestions.adaptability_comments &&
          !formData.adaptabilityReasoning
        )
          updates.adaptabilityReasoning = String(
            newSuggestions.adaptability_comments,
          );
        if (newSuggestions.suggested_hazards && !formData.hazards)
          updates.hazards = String(newSuggestions.suggested_hazards);
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

        if (stopReason) {
          updates.stopTriggered = true;
          const allowedWhenStopped = new Set([
            "propertyType",
            "entranceLevel",
            "bedrooms",
            "communalLifts",
            "propertyRampPresent",
            "throughFloorLift",
            "stepLift",
            "platformLift",
            "levelAccessShower",
            "ceilingTrackHoist",
            "stairLift",
            "throughFloorLiftWidth",
            "throughFloorLiftDepth",
            "stopTriggered",
            "hazards",
          ]);
          Object.keys(updates).forEach((key) => {
            if (!allowedWhenStopped.has(key)) delete updates[key];
          });
        }

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

  const handleStep3PhotosChanged = (
    _updatedCategoryPhotos: Record<string, string[]>,
  ) => {
    // Invalidate previous AI validation when evidence changes.
    setStep3AnalysisComplete(false);
    setCategoryResults({});
    setValidationErrors({});
  };

  const isNextDisabled = () => {
    if (isProcessing || isAnalyzing) return true;
    if (step === 1)
      return !formData.fullName || !formData.street || !formData.postcode;
    // Step 2 (Section B) has no required fields
    if (step === 3) return !formData.floorPlan && !formData.hasNoFloorPlan;
    if (step === 4)
      return (formData.photos || []).length < 1 || !step3AnalysisComplete;
    if (step === 5) return !formData.propertyType || !formData.entranceLevel;
    if (step === 6) return !formData.internalStairs;
    if (step === 7) return !formData.bathroomLocation;
    return false;
  };

  const startAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const inferredAnswers = deriveInferredAnswersFromAssessment(
        formData,
        formData.aiSuggestions || aiSuggestions,
      );
      const analysisData = {
        aiSuggestions: formData.aiSuggestions || aiSuggestions || {},
        floorPlan: floorPlanAnalysis || {},
      };
      console.log("Starting final AI analysis report...");
      const response = await fetch("/api/engine/report-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wizardData: formData,
          observations: formData.observations || [],
          analysisData,
        }),
      });

      console.log("AI analysis report response received");
      const data = await response.json();
      console.log("AI analysis report result:", data);
      const parsedResult = parseJsonPayload(data?.result);
      if (data.success && parsedResult) {
        const normalizedReportFill = normalizeReportFillPayload(parsedResult);
        const sectionFill =
          typeof normalizedReportFill.section_fill === "object" &&
          normalizedReportFill.section_fill !== null
            ? normalizedReportFill.section_fill
            : {};
        const stopFlags =
          typeof normalizedReportFill.stop_flags === "object" &&
          normalizedReportFill.stop_flags !== null
            ? normalizedReportFill.stop_flags
            : {};

        const num = (value: unknown): number | null => {
          if (typeof value === "number" && Number.isFinite(value)) return value;
          if (typeof value === "string" && value.trim() !== "") {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
          }
          return null;
        };
        const pickNumber = (...values: unknown[]): number | null => {
          for (const value of values) {
            const parsed = num(value);
            if (parsed !== null) return parsed;
          }
          return null;
        };

        // Enforce source precedence: floor plan > photos > user > report-fill fallback.
        const prioritizedSectionFill = { ...sectionFill };
        prioritizedSectionFill.entrance_level =
          normalizeEntranceLevel(floorPlanAnalysis?.entrance_level?.value) ??
          normalizeEntranceLevel(aiSuggestions.entrance_level) ??
          normalizeEntranceLevel(formData.entranceLevel) ??
          sectionFill.entrance_level;
        prioritizedSectionFill.bedroom_count =
          Number(floorPlanAnalysis?.bedroom_count?.value) ||
          Number(aiSuggestions.bedroom_count) ||
          Number(formData.bedrooms) ||
          Number(sectionFill.bedroom_count) ||
          0;

        const guessedDoorWidth = (value: number | null, fallback: number) =>
          value !== null ? value : fallback;
        prioritizedSectionFill.door_opening_width_living_room_cm =
          guessedDoorWidth(
            pickNumber(
              aiSuggestions.door_opening_width_living_room_cm,
              formData.doorLivingWidth,
              sectionFill.door_opening_width_living_room_cm,
            ),
            80,
          );
        prioritizedSectionFill.door_opening_width_kitchen_cm = guessedDoorWidth(
          pickNumber(
            aiSuggestions.door_opening_width_kitchen_cm,
            formData.doorKitchenWidth,
            sectionFill.door_opening_width_kitchen_cm,
          ),
          80,
        );
        prioritizedSectionFill.door_opening_width_bed_1_cm = guessedDoorWidth(
          pickNumber(
            aiSuggestions.door_opening_width_bed_1_cm,
            formData.doorBed1Width,
            sectionFill.door_opening_width_bed_1_cm,
          ),
          78,
        );
        prioritizedSectionFill.door_opening_width_bed_2_cm = guessedDoorWidth(
          pickNumber(
            aiSuggestions.door_opening_width_bed_2_cm,
            formData.doorBed2Width,
            sectionFill.door_opening_width_bed_2_cm,
          ),
          78,
        );
        prioritizedSectionFill.door_opening_width_bed_3_cm = guessedDoorWidth(
          pickNumber(
            aiSuggestions.door_opening_width_bed_3_cm,
            formData.doorBed3Width,
            sectionFill.door_opening_width_bed_3_cm,
          ),
          78,
        );
        prioritizedSectionFill.door_opening_width_bathroom_cm =
          guessedDoorWidth(
            pickNumber(
              aiSuggestions.door_opening_width_bathroom_cm,
              formData.doorBathroomWidth,
              sectionFill.door_opening_width_bathroom_cm,
            ),
            76,
          );
        prioritizedSectionFill.door_opening_width_separate_toilet_cm =
          guessedDoorWidth(
            pickNumber(
              aiSuggestions.door_opening_width_separate_toilet_cm,
              formData.doorToiletWidth,
              sectionFill.door_opening_width_separate_toilet_cm,
            ),
            74,
          );
        prioritizedSectionFill.door_opening_width_balcony_cm = guessedDoorWidth(
          pickNumber(
            aiSuggestions.door_opening_width_balcony_cm,
            formData.doorBalconyWidth,
            sectionFill.door_opening_width_balcony_cm,
          ),
          78,
        );

        const mergedSuggestions = {
          ...(formData.aiSuggestions || aiSuggestions || {}),
          ...prioritizedSectionFill,
          ...stopFlags,
        };

        setAiSuggestions(mergedSuggestions);
        handleUpdateField("aiSuggestions", mergedSuggestions);

        const stopTriggered =
          stopFlags.stop_assessment_flag === true ||
          stopFlags.stop_if_no_lift_or_ramp === true ||
          stopFlags.stop_if_internal_steps === true ||
          stopFlags.stop_if_stair_width === true ||
          stopFlags.stop_if_no_clearance_no_exit === true;
        if (stopTriggered) {
          const stopReason =
            typeof stopFlags.stop_reason === "string" &&
            stopFlags.stop_reason.trim()
              ? stopFlags.stop_reason.trim()
              : "Stop criteria met from AI report-fill checks.";
          handleUpdateField("stopTriggered", true);
          handleUpdateField("ahcStopFlag", stopReason);
        }

        if (normalizedReportFill.known_hazards.trim() && !formData.hazards) {
          handleUpdateField(
            "hazards",
            normalizedReportFill.known_hazards.trim(),
          );
        }

        handleUpdateField("aiReport", {
          Confidence: parsedResult.Confidence || "MEDIUM",
          ConfidenceScore: parsedResult.ConfidenceScore || "75%",
          Summary: parsedResult.Summary || {
            Strengths: "",
            Weaknesses: "",
            Recommendation: "",
          },
          ReportData: {
            ...(parsedResult.ReportData || {}),
            section_fill: prioritizedSectionFill,
            stop_flags: stopFlags,
            known_hazards: normalizedReportFill.known_hazards || "",
          },
          analysisData: {
            ...analysisData,
            reportFill: prioritizedSectionFill,
          },
          InferredAnswers: inferredAnswers,
          wizardData: {
            mobility: formData.mobility,
            bathing: formData.bathing,
            toileting: formData.toileting,
          },
        });
      } else {
        console.error("AI analysis report failed:", data);
        toast.error("Could not generate final AI report. Please try again.");
      }
    } catch (e) {
      console.error("AI Analysis error:", e);
      toast.error("An error occurred while generating the final report.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-1000">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="w-full max-w-[780px] h-[90vh] sm:h-[85vh] max-h-dvh bg-white/95 rounded-xl sm:rounded-[20px] flex flex-col overflow-hidden shadow-2xl border border-white/70"
      >
        {/* Header Section */}
        <ProgressBar currentStep={step} steps={steps} />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 min-h-0">
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
                onClearFloorPlan={handleClearFloorPlan}
                onSelectPlanningDoc={handleSelectPlanningDoc}
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
                onPhotosChanged={handleStep3PhotosChanged}
                streetViewSeededUrl={
                  formData.entranceSeeded
                    ? (formData.categoryPhotos?.entrance?.[0] ?? null)
                    : null
                }
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
            {step === analysisStepIndex && (
              <AnalysisStep
                key="s-final"
                formData={formData}
                handleUpdateField={handleUpdateField}
                isAnalyzing={isAnalyzing}
                onNext={() => {}}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer Controls */}
        <div className="shrink-0 py-2 px-3 sm:py-3 sm:px-5 bg-white border-t border-border flex flex-wrap justify-between items-center gap-2">
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200 flex items-center justify-center cursor-pointer text-slate-500 shrink-0 order-first"
            aria-label="Close"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 min-w-0 flex-1">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="py-2 px-3 sm:py-2.5 sm:px-5 bg-white text-text-main rounded-lg sm:rounded-xl border border-slate-200 font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0"
              >
                <ChevronLeft size={18} className="sm:w-5 sm:h-5 shrink-0" />{" "}
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className={cn(
                "py-2 px-3 sm:py-2.5 sm:px-5 bg-white rounded-lg sm:rounded-xl border font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 shrink-0",
                "border-primary text-primary",
                isSavingDraft && "opacity-70 cursor-not-allowed",
              )}
            >
              {isSavingDraft ? (
                "Saving…"
              ) : (
                <>
                  <span className="hidden sm:inline">Save Progress</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </button>

            {step === 4 && (
              <button
                onClick={() => {
                  void startStep3BatchAnalysis();
                }}
                disabled={
                  (formData.photos || []).length < 1 ||
                  isAnalyzing ||
                  isProcessing ||
                  step3AnalysisComplete
                }
                className={cn(
                  "py-2 px-3 sm:py-2.5 sm:px-5 rounded-lg sm:rounded-xl border font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 shrink-0",
                  step3AnalysisComplete &&
                    "border-green-600 text-green-600 bg-green-50 cursor-not-allowed",
                  isAnalyzing &&
                    !step3AnalysisComplete &&
                    "border-primary text-primary bg-white cursor-not-allowed",
                  ((formData.photos || []).length < 1 || isProcessing) &&
                    !step3AnalysisComplete &&
                    !isAnalyzing &&
                    "bg-slate-300 border-slate-300 text-white cursor-not-allowed opacity-60 shadow-none",
                  !step3AnalysisComplete &&
                    !isAnalyzing &&
                    (formData.photos || []).length >= 1 &&
                    !isProcessing &&
                    "border-primary text-primary font-extrabold bg-white",
                )}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="animate-spin shrink-0" size={14} />
                    <span className="hidden sm:inline">Analysing...</span>
                  </>
                ) : step3AnalysisComplete ? (
                  <>
                    <CheckCircle size={14} className="shrink-0" />
                    <span className="hidden sm:inline">Analysed</span>
                  </>
                ) : (
                  <>
                    <Camera size={14} className="shrink-0" />
                    <span className="hidden sm:inline">Analyse Photos</span>
                  </>
                )}
              </button>
            )}

            <button
              disabled={isNextDisabled()}
              onClick={() => {
                if (step === analysisStepIndex) {
                  handleSafeClose();
                  return;
                }
                if (step === 8) {
                  setStep(step + 1);
                  startAiAnalysis();
                  return;
                }
                setStep(step + 1);
              }}
              className={cn(
                "py-2 px-3 sm:py-2.5 sm:px-5 rounded-lg sm:rounded-xl border-none font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 transition-all shrink-0",
                isNextDisabled()
                  ? "bg-slate-300 text-white cursor-not-allowed opacity-60 shadow-none"
                  : "bg-primary text-white cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.3)]",
              )}
            >
              <span className="hidden sm:inline">
                {step === analysisStepIndex
                  ? "Complete Assessment"
                  : step === 8
                    ? "Generate AI Report"
                    : "Continue"}
              </span>
              <span className="sm:hidden">
                {step === analysisStepIndex
                  ? "Complete"
                  : step === 8
                    ? "Report"
                    : "Next"}
              </span>
              {step < analysisStepIndex && (
                <ChevronRight size={18} className="sm:w-5 sm:h-5 shrink-0" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  async function handleSafeClose() {
    const { url: floorPlanUrl, previewUrl: floorPlanPreviewUrl } =
      await persistFloorPlan();
    const detectionPayload = await buildFloorPlanDetectionPayload();
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
      aiScore: null,
      status: "Review",
      source: "Manual Entry",
      date: new Date().toISOString(),
      thumbnail: (formData.photos && formData.photos[0]) || "",
      evidence: formData.photos || [],
      description: `AHR Assessment for ${formData.fullName || "Client"}`,
      observations: [],
      mlData: {
        imageCount: formData.photos?.length || 0,
        floorPlanAvailable: !!floorPlanUrl,
        wizardData: { ...formData, floorPlan: floorPlanUrl, floorPlanPreviewUrl },
        aiReport: formData.aiReport,
        floorPlanDetection: detectionPayload,
        propertyId: formData.propertyId ?? null,
      },
    };

    onComplete(completedCase);
    onClose();
  }
};

export default AssessmentWizard;
