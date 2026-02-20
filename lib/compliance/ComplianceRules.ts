import { ComplianceRule } from '@/types/compliance';
import { complianceEngine } from './ComplianceRuleEngine';

// --- SECTION A: ACCESS ---

export const Rule_EntranceLevel: ComplianceRule = {
    id: 'AHR_A_EntranceLevel',
    section: 'A',
    description: "Dwelling must be on Ground Floor or accessible by Lift.",
    riskLevel: 'CRITICAL',
    trigger: 'STOP_ASSESSMENT',
    overrideAllowed: false,
    condition: (data: any) => {
        const level = data.external_access?.entrance_level;
        const lift = data.external_access?.lift_present;

        if (level === 'GROUND') return true;
        if (level === 'UPPER' && lift === true) return true;
        if (level === 'BASEMENT' && lift === true) return true;

        return false; // Fail: Upper/Basement without Lift
    }
};

export const Rule_CommunalSteps: ComplianceRule = {
    id: 'AHR_A_CommunalSteps',
    section: 'A',
    description: "Communal access should have fewer than 4 steps if no lift is present.",
    riskLevel: 'HIGH',
    trigger: 'FLAG_RISK',
    overrideAllowed: true,
    condition: (data: any) => {
        const steps = data.external_access?.steps?.count || 0;
        return steps <= 4;
    }
};

// --- SECTION C: VERTICAL CIRCULATION ---

export const Rule_StairWidth_Straight: ComplianceRule = {
    id: 'AHR_C_StairWidth_Straight',
    section: 'C',
    description: "Straight internal stairs must be at least 70cm wide.",
    riskLevel: 'CRITICAL',
    trigger: 'STOP_ASSESSMENT',
    overrideAllowed: true, // Allow User Measure Override
    condition: (data: any) => {
        const stairs = data.vertical_circulation?.internal_stairs;
        if (!stairs || stairs.geometry !== 'STRAIGHT') return true; // N/A

        const width = stairs.width_cm?.[0] || 999; // Use min estimation
        return width >= 70;
    }
};

export const Rule_InternalSteps: ComplianceRule = {
    id: 'AHR_C_InternalSplitLevel',
    section: 'C',
    description: "Internal split levels (scattered steps) create barriers.",
    riskLevel: 'HIGH',
    trigger: 'FLAG_RISK',
    overrideAllowed: true,
    condition: (data: any) => {
        return data.vertical_circulation?.internal_levels?.has_split_level !== true;
    }
};

// --- SECTION E: FACILITIES ---

export const Rule_ToiletLateralSpace: ComplianceRule = {
    id: 'AHR_E_ToiletSpace',
    section: 'E',
    description: "Toilet must have >45cm clear lateral transfer space.",
    riskLevel: 'HIGH',
    trigger: 'FLAG_RISK',
    overrideAllowed: true,
    condition: (data: any) => {
        const width = data.facilities?.toilet?.lateral_space_cm?.[0] || 999;
        return width >= 45;
    }
};

export const Rule_KitchenTurning: ComplianceRule = {
    id: 'AHR_E_KitchenTurning',
    section: 'E',
    description: "Kitchen must support 150cm turning circle.",
    riskLevel: 'MEDIUM',
    trigger: 'FLAG_RISK',
    overrideAllowed: true,
    condition: (data: any) => {
        return data.facilities?.kitchen?.turning_circle_fits === true;
    }
};

// --- REGISTRATION ---

export const registerAllRules = () => {
    complianceEngine.registerRule(Rule_EntranceLevel);
    complianceEngine.registerRule(Rule_CommunalSteps);
    complianceEngine.registerRule(Rule_StairWidth_Straight);
    complianceEngine.registerRule(Rule_InternalSteps);
    complianceEngine.registerRule(Rule_ToiletLateralSpace);
    complianceEngine.registerRule(Rule_KitchenTurning);
    console.log("Enterprise Compliance Rules Registered");
};
