export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface UncertaintyRange {
    min: number;
    max: number;
    unit: 'mm' | 'cm' | 'm';
    confidence: number; // 0.0 - 1.0
}

export type ComplianceGrade = 'GRADE_A' | 'GRADE_B' | 'GRADE_C' | 'GRADE_D';

export interface CalibrationData {
    detected: boolean;
    objectType: 'A4_PAPER' | 'CREDIT_CARD' | 'UNKNOWN';
    qualityScore: number; // 0.0 - 1.0
    issues: string[];
    canProceed: boolean;
}

export interface AssessmentLog {
    id: string;
    timestamp: string;
    surveyorId: string;
    propertyId: string;
    field: string;
    source: 'AI_VISION' | 'OCR' | 'MANUAL' | 'GEOSPATIAL';
    evidenceId?: string; // Photo ID
    value: string | number | boolean | UncertaintyRange;
    confidence: number;
    ruleApplied?: string;
    outcome: 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_ADAPTATION' | 'UNKNOWN';
    manualOverride: boolean;
    notes?: string;
}

export interface ComplianceRule {
    id: string;
    section: string; // e.g., "D.1"
    description: string;
    condition: (data: any) => boolean;
    trigger: 'STOP_ASSESSMENT' | 'FLAG_RISK' | 'AUTO_PASS';
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    overrideAllowed: boolean;
}

export interface PropertyRiskAssessment {
    overallGrade: ComplianceGrade;
    summary: string;
    riskFactors: {
        category: string;
        risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
        description: string;
    }[];
    auditTrail: AssessmentLog[];
}
