import { FloorPlanAnalysisResult } from "@/lib/utils/FloorPlanUtils";

export interface WizardStepProps {
  formData: any;
  handleUpdateField: (field: string, value: any) => void;
  handlePhotoUpload?: (
    e: React.ChangeEvent<HTMLInputElement>,
    categoryId?: string,
  ) => void;
  floorPlanAnalysis?: FloorPlanAnalysisResult | null;
  onNext?: () => void;
  onBack?: () => void;
  isAnalyzing?: boolean;
  isProcessing?: boolean;
  processingCategory?: string | null;
  aiSuggestions?: Record<string, any>;
  validationErrors?: Record<string, string>;
  onClearValidationError?: (categoryId: string) => void;
  onAnalyze?: () => void;
  analysisComplete?: boolean;
  categoryResults?: Record<string, 'valid' | 'invalid'>;
  onPhotosChanged?: (updatedCategoryPhotos: Record<string, string[]>) => void;
  onClearFloorPlan?: () => void;
  onSelectPlanningDoc?: (sourceId: string, description?: string) => Promise<void>;
  streetViewSeededUrl?: string | null;
}
