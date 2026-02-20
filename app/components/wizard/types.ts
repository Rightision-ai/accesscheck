import { FloorPlanAnalysisResult } from "../../utils/FloorPlanUtils";

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
}
