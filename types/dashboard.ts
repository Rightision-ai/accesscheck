export interface AiReport {
    Confidence: "HIGH" | "MEDIUM" | "LOW" | string;
    ConfidenceScore?: string;
    InferredAnswers: Record<string, string>;
    Summary: {
        Strengths: string;
        Weaknesses: string;
        Recommendation: string;
    };
    ReportData?: Record<string, any>;
    analysisData?: Record<string, any>;
    wizardData?: {
      mobility?: string;
      bathing?: string;
      toileting?: string;
    };
}

export type AccessibilityGrade = "A+" | "A-" | "B+" | "B-" | "C";

export interface Case {
    id: string;
    applicantName: string;
    address: string;
    city: string;
    postcode: string;
    phoneNumber?: string;
    assessmentDate: string;
    aiScore: number | null;
    accessibilityGrade?: AccessibilityGrade | null;
    accessibilityLabel?: string | null;
    accessibilityReasons?: string[];
    status: string;
    source: string;
    date: string;
    thumbnail: string;
    evidence: string[];
    description: string;
    observations?: any[];
    mlData: {
        imageCount: number;
        floorPlanAvailable?: boolean;
        nlpFlags?: string[];
        wizardData: any;
        aiReport?: AiReport;
        rawAhr?: any;
        userOverrides?: Record<string, any>;
        isLocked?: boolean;
        floorPlanDetection?: any;
        surveyUpdatedAt?: string | null;
        surveyRow?: any;
        propertyId?: string | null;
    };
}
