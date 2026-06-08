import { convertHeicToJpegIfNeeded } from "./imageUtils";

export const compressBase64Image = (base64: string, maxDim = 1024, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64); // fallback to original on error
        img.src = base64;
    });
};

/** Fetches an image URL and returns it as a base64 data URL for Gemini. */
export const urlToBase64 = async (url: string): Promise<string | null> => {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};

export interface ImageAnalysisResult {
    valid: boolean;
    reason?: string;
    data: Record<string, any>;
    confidence?: Record<string, number>;
}

const CATEGORY_PROMPTS: Record<string, string> = {
    kitchen: `
        Analyze this image. 
        1. VALIDATION: Is this a kitchen? (YES/NO). If NO, explain why.
        2. EXTRACTION:
           - turning_circle: Does it look like there is a 1500mm turning circle? (true/false)
           - turning_circle_170x140: Does it look like there is a 1700x1400mm turning ellipse? (true/false)
           - accessible_layout: Are units accessible? (true/false)
           - separate_from_living: Is it a separate room from the living area? (true/false)
        
        RETURN JSON: { "valid": boolean, "reason": string, "data": { "turning_circle": boolean, "turning_circle_170x140": boolean, "accessible_layout": boolean, "separate_from_living": boolean } }
    `,
    bathroom: `
        Analyze this image.
        1. VALIDATION: Is this a bathroom or toilet? (YES/NO). If NO, explain why.
        2. EXTRACTION:
           - bathing_type: 'Level Access Shower', 'Shower Cubicle', 'Over-Bath Shower', 'Bath Only'
           - toilet_type: 'Standard', 'Raised Height', 'Wash/Dry (Smart)'
           - turning_circle: Does it look like there is a 1500mm turning circle? (true/false)
           - has_bath: boolean
           - has_shower: boolean
           - walls: 'Solid', 'Stud', 'Unknown' (for adaptation feasibility)
        
        RETURN JSON: { "valid": boolean, "reason": string, "data": { "bathing_type": string, "toilet_type": string, "turning_circle": boolean, "has_bath": boolean, "has_shower": boolean, "walls": string } }
    `,
    entrance: `
        Analyze this image.
        1. VALIDATION: Is this a property entrance (door/porch)? (YES/NO).
        2. EXTRACTION:
           - entrance_level: 'Ground Floor', 'Upper Floor', 'Basement', 'Split Level'
           - step_count: Number of steps visible (number)
           - step_type: 'No steps', ' Few steps', 'Steep slope', 'Steady slope'
           - door_width_visual: 'Wide (>80cm)', 'Standard (70-80cm)', 'Narrow (<70cm)'
           - threshold_height: 'Flush', 'Low (<15mm)', 'High (>15mm)'
        
        RETURN JSON: { "valid": boolean, "reason": string, "data": { "entrance_level": string, "step_count": number, "step_type": string, "door_width_visual": string, "threshold_height": string } }
    `,
    stairs: `
        Analyze this image.
        1. VALIDATION: Is this a staircase? (YES/NO).
        2. EXTRACTION:
           - has_stairs: true
           - stair_type: 'Straight', 'Quarter Turn', 'Half Turn', 'Spiral', 'Winding'
           - handrails: 'None', 'Left Side', 'Right Side', 'Both Sides'
           - stair_lift_present: boolean
        
        RETURN JSON: { "valid": boolean, "reason": string, "data": { "has_stairs": boolean, "stair_type": string, "handrails": string, "stair_lift_present": boolean } }
    `,
    hallway: `
        Analyze this image.
        1. VALIDATION: Is this a hallway/corridor? (YES/NO).
        2. EXTRACTION:
           - width_visual: 'Wide (>120cm)', 'Standard (90-120cm)', 'Narrow (<90cm)'
           - obstructions: 'None', 'Radiator', 'Furniture', 'Boxed pipes'
           - door_clearance: 'Good', 'Restricted'
        
        RETURN JSON: { "valid": boolean, "reason": string, "data": { "width_visual": string, "obstructions": string, "door_clearance": string } }
    `,
    garden: `
        Analyze this image.
        1. VALIDATION: Is this a garden or external access area? (YES/NO).
        2. EXTRACTION:
           - access_type: 'Level', 'Ramped', 'Stepped'
           - step_count: number
           - surface: 'Paved', 'Grass', 'Gravel', 'Decking'
        
        RETURN JSON: { "valid": boolean, "reason": string, "data": { "access_type": string, "step_count": number, "surface": string } }
    `
};

export interface BatchAnalysisResult {
    results: Record<string, ImageAnalysisResult>;
    safety: {
        second_exit_suggested: boolean;
        suggested_hazards: string;
    };
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const toSnakeKey = (key: string): string =>
    key
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();

const flattenToSnakeRecord = (
    value: unknown,
    prefix = "",
    out: Record<string, any> = {},
): Record<string, any> => {
    if (!isObjectRecord(value)) return out;

    Object.entries(value).forEach(([rawKey, rawVal]) => {
        const key = toSnakeKey(rawKey);
        const fullKey = prefix ? `${prefix}_${key}` : key;

        if (isObjectRecord(rawVal)) {
            flattenToSnakeRecord(rawVal, fullKey, out);
            return;
        }

        if (Array.isArray(rawVal)) {
            out[fullKey] = rawVal.join(", ");
            return;
        }

        out[fullKey] = rawVal;
    });

    return out;
};

const boolFromUnknown = (value: unknown): boolean | null => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["yes", "y", "true"].includes(normalized)) return true;
        if (["no", "n", "false"].includes(normalized)) return false;
    }
    return null;
};

const stringFromFirst = (
    source: Record<string, any>,
    keys: string[],
): string | null => {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.trim() !== "") return value.trim();
    }
    return null;
};

const boolFromFirst = (
    source: Record<string, any>,
    keys: string[],
): boolean | null => {
    for (const key of keys) {
        const value = boolFromUnknown(source[key]);
        if (value !== null) return value;
    }
    return null;
};

const numberFromFirst = (
    source: Record<string, any>,
    keys: string[],
): number | null => {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string" && value.trim() !== "") {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
    }
    return null;
};

const normalizeThresholdBand = (value: unknown): string => {
    const v = String(value ?? "").trim().toLowerCase();
    if (!v) return "";
    if (v.includes("10") && (v.includes("above") || v.includes(">=") || v.includes("over"))) {
        return "10cm or above";
    }
    if ((v.includes("1.5") || v.includes("15mm")) && (v.includes("under 10") || v.includes("below 10"))) {
        return "Under 10cm and above 1.5cm";
    }
    if (v.includes("0") && (v.includes("1.5") || v.includes("15mm"))) {
        return "0 - 1.5cm";
    }
    if (v.includes("flush") || v.includes("level")) return "0 - 1.5cm";
    return "";
};

const ensureNumber = (value: unknown, fallback: number): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

export const normalizeReportFillPayload = (raw: unknown): Record<string, any> => {
    const payload = isObjectRecord(raw) ? raw : {};
    const sectionFillRaw = isObjectRecord(payload.section_fill)
        ? payload.section_fill
        : flattenToSnakeRecord(payload);
    const stopRaw = isObjectRecord(payload.stop_flags) ? payload.stop_flags : {};

    const sectionFill = { ...sectionFillRaw } as Record<string, any>;

    // Canonical threshold bands
    sectionFill.property_front_door_threshold_band = normalizeThresholdBand(
        stringFromFirst(sectionFill, [
            "property_front_door_threshold_band",
            "property_front_door_threshold_height_band",
            "property_door_threshold_band",
            "property_door_threshold_height",
        ]),
    );
    sectionFill.second_exit_threshold_band = normalizeThresholdBand(
        stringFromFirst(sectionFill, [
            "second_exit_threshold_band",
            "second_exit_threshold_height_band",
            "second_exit_threshold_height",
        ]),
    );

    // Canonical door widths
    sectionFill.door_opening_width_living_room_cm = ensureNumber(
        numberFromFirst(sectionFill, [
            "door_opening_width_living_room_cm",
            "door_width_living_room",
            "living_room_door_width_cm",
        ]),
        80,
    );
    sectionFill.door_opening_width_kitchen_cm = ensureNumber(
        numberFromFirst(sectionFill, [
            "door_opening_width_kitchen_cm",
            "door_width_kitchen",
            "kitchen_door_width_cm",
        ]),
        80,
    );
    sectionFill.door_opening_width_bed_1_cm = ensureNumber(
        numberFromFirst(sectionFill, [
            "door_opening_width_bed_1_cm",
            "door_width_bed1",
            "door_width_bed_1",
            "bed_1_door_width_cm",
        ]),
        78,
    );
    sectionFill.door_opening_width_bed_2_cm = ensureNumber(
        numberFromFirst(sectionFill, [
            "door_opening_width_bed_2_cm",
            "door_width_bed2",
            "door_width_bed_2",
            "bed_2_door_width_cm",
        ]),
        78,
    );
    sectionFill.door_opening_width_bed_3_cm = ensureNumber(
        numberFromFirst(sectionFill, [
            "door_opening_width_bed_3_cm",
            "door_width_bed3",
            "door_width_bed_3",
            "bed_3_door_width_cm",
        ]),
        78,
    );
    sectionFill.door_opening_width_bathroom_cm = ensureNumber(
        numberFromFirst(sectionFill, [
            "door_opening_width_bathroom_cm",
            "door_width_bathroom",
            "bathroom_door_width_cm",
        ]),
        76,
    );
    sectionFill.door_opening_width_separate_toilet_cm = ensureNumber(
        numberFromFirst(sectionFill, [
            "door_opening_width_separate_toilet_cm",
            "door_width_separate_toilet",
            "separate_toilet_door_width_cm",
        ]),
        74,
    );
    sectionFill.door_opening_width_balcony_cm = ensureNumber(
        numberFromFirst(sectionFill, [
            "door_opening_width_balcony_cm",
            "door_width_balcony",
            "balcony_door_width_cm",
        ]),
        78,
    );

    // Core measurements that should always be numeric
    sectionFill.communal_front_door_opening_width_cm = ensureNumber(
        numberFromFirst(sectionFill, ["communal_front_door_opening_width_cm"]),
        85,
    );
    sectionFill.property_front_door_opening_width_cm = ensureNumber(
        numberFromFirst(sectionFill, ["property_front_door_opening_width_cm"]),
        82,
    );
    sectionFill.communal_lift_internal_width_cm = ensureNumber(
        numberFromFirst(sectionFill, ["communal_lift_internal_width_cm"]),
        110,
    );
    sectionFill.communal_lift_internal_depth_cm = ensureNumber(
        numberFromFirst(sectionFill, ["communal_lift_internal_depth_cm"]),
        140,
    );
    sectionFill.communal_lift_door_opening_width_cm = ensureNumber(
        numberFromFirst(sectionFill, ["communal_lift_door_opening_width_cm"]),
        90,
    );
    const stopFlags = {
        stop_if_no_lift_or_ramp:
            boolFromFirst(stopRaw as Record<string, any>, ["stop_if_no_lift_or_ramp"]) ?? false,
        stop_if_internal_steps:
            boolFromFirst(stopRaw as Record<string, any>, ["stop_if_internal_steps"]) ?? false,
        stop_if_stair_width:
            boolFromFirst(stopRaw as Record<string, any>, ["stop_if_stair_width"]) ?? false,
        stop_if_no_clearance_no_exit:
            boolFromFirst(stopRaw as Record<string, any>, ["stop_if_no_clearance_no_exit"]) ?? false,
        stop_assessment_flag:
            boolFromFirst(stopRaw as Record<string, any>, ["stop_assessment_flag"]) ?? false,
        stop_reason:
            stringFromFirst(stopRaw as Record<string, any>, ["stop_reason"]) ?? "",
    };

    return {
        ...payload,
        section_fill: sectionFill,
        stop_flags: stopFlags,
        known_hazards:
            typeof payload.known_hazards === "string"
                ? payload.known_hazards
                : "",
    };
};

const normalizeBatchResponse = (
    raw: unknown,
    categoriesPresent: string[],
): BatchAnalysisResult => {
    const defaultSafety = {
        second_exit_suggested: false,
        suggested_hazards: "",
    };
    const payload = isObjectRecord(raw) ? raw : {};

    if (isObjectRecord(payload.results)) {
        const safety = isObjectRecord(payload.safety)
            ? {
                second_exit_suggested:
                    typeof payload.safety.second_exit_suggested === "boolean"
                        ? payload.safety.second_exit_suggested
                        : false,
                suggested_hazards:
                    typeof payload.safety.suggested_hazards === "string"
                        ? payload.safety.suggested_hazards
                        : "",
            }
            : defaultSafety;

        return {
            results: payload.results as Record<string, ImageAnalysisResult>,
            safety,
        };
    }

    // Gemini can occasionally return section-heading JSON despite the "results" contract.
    const mergedData = flattenToSnakeRecord(payload);

    const canonicalHasStairs = boolFromFirst(mergedData, [
        "has_stairs",
        "internal_stairs",
        "internal_stairs_present",
        "stairs_present",
        "internal_layout_and_circulation_has_stairs",
        "internal_layout_and_circulation_internal_stairs",
    ]);
    if (canonicalHasStairs !== null) mergedData.has_stairs = canonicalHasStairs;

    const canonicalStairType = stringFromFirst(mergedData, [
        "stair_type",
        "stairs_type",
        "internal_stair_type",
        "internal_layout_and_circulation_stair_type",
    ]);
    if (canonicalStairType) mergedData.stair_type = canonicalStairType;

    const canonicalHandrails = stringFromFirst(mergedData, [
        "handrails",
        "handrail_side",
        "stair_handrails",
        "internal_layout_and_circulation_handrails",
    ]);
    if (canonicalHandrails) mergedData.handrails = canonicalHandrails;

    const canonicalStairLift = boolFromFirst(mergedData, [
        "stair_lift_present",
        "stairlift_present",
        "internal_lift_present",
        "internal_layout_and_circulation_stair_lift_present",
    ]);
    if (canonicalStairLift !== null) mergedData.stair_lift_present = canonicalStairLift;

    const canonicalBathingType = stringFromFirst(mergedData, [
        "bathing_type",
        "bath_type",
        "shower_type",
        "bathroom_facilities_bathing_type",
        "key_rooms_and_facilities_bathing_type",
    ]);
    if (canonicalBathingType) mergedData.bathing_type = canonicalBathingType;

    const canonicalToiletType = stringFromFirst(mergedData, [
        "toilet_type",
        "wc_type",
        "bathroom_facilities_toilet_type",
        "key_rooms_and_facilities_toilet_type",
    ]);
    if (canonicalToiletType) mergedData.toilet_type = canonicalToiletType;

    const canonicalBathroomLocation = stringFromFirst(mergedData, [
        "bathroom_location",
        "bathroom_floor",
        "bathroom_level",
        "key_rooms_and_facilities_bathroom_location",
    ]);
    if (canonicalBathroomLocation) mergedData.bathroom_location = canonicalBathroomLocation;

    const canonicalCommunalLiftPresent = boolFromFirst(mergedData, [
        "communal_lift_present",
        "lift_present",
        "communal_lifts_present",
        "communal_lift_available",
        "external_approach_and_entrances_communal_lift_present",
        "entrance_communal_lift_present",
    ]);
    if (canonicalCommunalLiftPresent !== null) {
        mergedData.communal_lift_present = canonicalCommunalLiftPresent;
    }

    const canonicalCommunalLiftType = stringFromFirst(mergedData, [
        "communal_lift_type",
        "lift_type",
        "communal_lift_kind",
        "external_approach_and_entrances_communal_lift_type",
        "entrance_communal_lift_type",
    ]);
    if (canonicalCommunalLiftType) {
        mergedData.communal_lift_type = canonicalCommunalLiftType;
    }

    if (typeof mergedData.communal_lifts_option !== "string") {
        if (mergedData.communal_lift_present === false) {
            mergedData.communal_lifts_option = "No";
        } else if (
            String(mergedData.communal_lift_type || "")
                .trim()
                .toLowerCase()
                .includes("platform")
        ) {
            mergedData.communal_lifts_option = "Yes - Platform";
        } else if (
            mergedData.communal_lift_present === true ||
            String(mergedData.communal_lift_type || "")
                .trim()
                .toLowerCase()
                .includes("pass")
        ) {
            mergedData.communal_lifts_option = "Yes - Passenger";
        }
    }

    const categories = categoriesPresent.length > 0 ? categoriesPresent : ["general"];
    const results = Object.fromEntries(
        categories.map((category) => [
            category,
            {
                valid: true,
                reason: "Normalized from section-based JSON response",
                data: mergedData,
                confidence: {},
            } satisfies ImageAnalysisResult,
        ]),
    );

    return {
        results,
        safety: defaultSafety,
    };
};

export const analyzeAllCategoryPhotos = async (
    categoryPhotos: Record<string, string[]>,
): Promise<BatchAnalysisResult | null> => {
    try {
        const images: Array<{ mime_type: string; data: string }> = [];
        const categoriesPresent: string[] = [];

        await Promise.all(
            Object.entries(categoryPhotos).map(async ([category, photos]) => {
                if (!photos || photos.length === 0) return;
                const source = photos[0];
                const base64Source = source.startsWith("data:")
                    ? source
                    : await urlToBase64(source);
                if (!base64Source) return;
                const compressed = await compressBase64Image(base64Source);
                const match = compressed.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
                if (match) {
                    images.push({ mime_type: match[1], data: match[2] });
                    categoriesPresent.push(category);
                }
            }),
        );

        if (images.length === 0) return null;

        const response = await fetch("/api/gemini/floor-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images, categories: categoriesPresent }),
        });

        if (!response.ok) {
            console.error("Gemini photo analysis failed:", response.statusText);
            return null;
        }

        const payload = await response.json();
        if (!payload.success || !payload.result) return null;

        return normalizeBatchResponse(payload.result, categoriesPresent);
    } catch (error) {
        console.warn("Gemini photo analysis error:", error);
        return null;
    }
};

export const analyzeCategoryPhoto = async (file: File, categoryId: string): Promise<ImageAnalysisResult | null> => {
    try {
        file = await convertHeicToJpegIfNeeded(file);

        const prompt = CATEGORY_PROMPTS[categoryId];
        if (!prompt) {
            console.warn(`No prompt defined for category: ${categoryId}`);
            return null;
        }

        // Convert file to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });

        const requestBody = {
            prompt,
            images: [{
                mime_type: file.type,
                data: base64Data
            }]
        };

        const response = await fetch('/api/gemini/floor-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            console.error('Gemini Analysis Failed:', response.statusText);
            return null;
        }

        const data = await response.json();
        let cleanJson = data.result;

        // Clean up JSON if it's a string
        if (typeof cleanJson === 'string') {
            if (cleanJson.includes('```json')) {
                cleanJson = cleanJson.replace(/```json\n?/, '').replace(/```/, '');
            } else if (cleanJson.includes('```')) {
                cleanJson = cleanJson.replace(/```\n?/, '').replace(/```/, '');
            }
            try {
                cleanJson = JSON.parse(cleanJson);
            } catch (e) {
                console.error("Failed to parse AI response JSON", e);
                return null;
            }
        }

        return cleanJson as ImageAnalysisResult;

    } catch (error) {
        console.error('Error analyzing photo:', error);
        return null;
    }
};
