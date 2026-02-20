import { ComplianceRule, ComplianceGrade, AssessmentLog, PropertyRiskAssessment } from '@/types/compliance';
import { auditLogger } from './ComplianceServices';

export class ComplianceRuleEngine {
    private rules: ComplianceRule[] = [];

    registerRule(rule: ComplianceRule) {
        if (!this.rules.find(r => r.id === rule.id)) {
            this.rules.push(rule);
        }
    }

    evaluate(data: any): PropertyRiskAssessment {
        const riskFactors: { category: string; risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'; description: string }[] = [];
        let criticalFailures = 0;
        let highRisks = 0;
        let mediumRisks = 0;

        for (const rule of this.rules) {
            const isCompliant = rule.condition(data);

            if (!isCompliant) {
                // Determine Outcome based on Trigger
                let outcome: 'NON_COMPLIANT' | 'REQUIRES_ADAPTATION' | 'UNKNOWN' = 'NON_COMPLIANT';

                if (rule.trigger === 'STOP_ASSESSMENT') {
                    criticalFailures++;
                    riskFactors.push({
                        category: rule.section,
                        risk: 'CRITICAL',
                        description: `STOP CONDITION MET: ${rule.description}`
                    });
                } else if (rule.riskLevel === 'HIGH') {
                    highRisks++;
                    riskFactors.push({
                        category: rule.section,
                        risk: 'HIGH',
                        description: `High Risk Failure: ${rule.description}`
                    });
                } else if (rule.riskLevel === 'MEDIUM') {
                    mediumRisks++;
                    riskFactors.push({
                        category: rule.section,
                        risk: 'MEDIUM',
                        description: `Medium Risk: ${rule.description}`
                    });
                }

                // Log the failure
                auditLogger.log({
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    surveyorId: 'SYSTEM', // Or User ID
                    propertyId: data.propertyId,
                    field: rule.section,
                    source: 'AI_VISION', // Default, should be dynamic
                    value: 'FAIL', // Should be specific value
                    confidence: 1.0, // Since rules are deterministic on validated data
                    ruleApplied: rule.id,
                    outcome: outcome,
                    manualOverride: false,
                    notes: rule.description
                });
            } else {
                auditLogger.log({
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    surveyorId: 'SYSTEM',
                    propertyId: data.propertyId,
                    field: rule.section,
                    source: 'AI_VISION',
                    value: 'PASS',
                    confidence: 1.0,
                    ruleApplied: rule.id,
                    outcome: 'COMPLIANT',
                    manualOverride: false
                });
            }
        }

        // Aggregate Grade
        let overallGrade: ComplianceGrade = 'GRADE_A';
        let summary = "Fully Compliant Property";

        if (criticalFailures > 0) {
            overallGrade = 'GRADE_D';
            summary = "Not Suitable / Critical Barriers Detected";
        } else if (highRisks > 0) {
            overallGrade = 'GRADE_C';
            summary = "Major Adaptations Required";
        } else if (mediumRisks > 0) {
            overallGrade = 'GRADE_B';
            summary = "Adaptable with Minor Works";
        }

        return {
            overallGrade,
            summary,
            riskFactors,
            auditTrail: auditLogger.getTrace()
        };
    }
}

export const complianceEngine = new ComplianceRuleEngine();
