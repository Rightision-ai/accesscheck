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

import type { AssessmentStatus } from "@/types/accesscheck";

export interface Case {
    id: string;
    applicantName: string;
    address: string;
    city: string;
    postcode: string;
    phoneNumber?: string;
    assessmentDate: string;
    aiScore: number | null;
    /**
     * There is no grade field on a case. The Accessible Housing Rules band (A-G) is the only
     * accessibility rating the product has, and it is classified on demand from the survey row
     * — `classifyLahr(resolveSurveyRow(caseData))` — never carried on the case or read back
     * from a persisted column, both of which go stale the moment an override is edited.
     */
    status: AssessmentStatus;
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
