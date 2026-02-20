export interface AiReport {
    AccessibilityScore: string;
    Grade: string;
    InferredAnswers: Record<string, string>;
    Summary: {
        Strengths: string;
        Weaknesses: string;
        Recommendation: string;
    };
}

export interface Case {
    id: string;
    applicantName: string;
    address: string;
    city: string;
    postcode: string;
    phoneNumber?: string;
    assessmentDate: string;
    aiScore: number | null;
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
    };
}
