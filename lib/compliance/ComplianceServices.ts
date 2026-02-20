import { CalibrationData, AssessmentLog, UncertaintyRange } from '@/types/compliance';

export class CalibrationGate {
    private static MIN_QUALITY_SCORE = 0.7;

    static evaluate(data: CalibrationData): boolean {
        if (!data.detected) return false;

        // Strict Gate: If quality score is below threshold, reject dimension analysis
        if (data.qualityScore < this.MIN_QUALITY_SCORE) {
            console.warn(`Calibration Failed: Quality Score ${data.qualityScore} below threshold ${this.MIN_QUALITY_SCORE}`);
            return false;
        }

        // Additional checks for specific issues
        if (data.issues.includes('perspective_distortion') || data.issues.includes('partial_occlusion')) {
            console.warn(`Calibration Warning: Issues detected - ${data.issues.join(', ')}`);
            // Could implement conditional logic here, e.g., require manual override
            return false;
        }

        return true;
    }

    static getConfidenceModifier(data: CalibrationData): number {
        // Degrade confidence based on calibration quality
        return Math.max(0.1, data.qualityScore); // Floor confidence at 0.1
    }
}

export class AuditLogger {
    private logs: AssessmentLog[] = [];

    log(entry: AssessmentLog) {
        this.logs.push({
            ...entry,
            timestamp: new Date().toISOString()
        });
        console.log(`[AUDIT] ${entry.field}: ${entry.outcome}`, entry);
    }

    getTrace(): AssessmentLog[] {
        return this.logs;
    }

    // Function to export trace for legal/compliance review
    exportTrace(): string {
        return JSON.stringify(this.logs, null, 2);
    }

    clear() {
        this.logs = [];
    }
}

export const auditLogger = new AuditLogger();
