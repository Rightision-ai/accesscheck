import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, rgb, StandardFonts } from 'pdf-lib';

interface WizardData {
    fullName: string;
    doorNo?: string;
    streetNo?: string;
    buildingName?: string;
    street: string;
    postcode: string;
    phoneNumber: string;
    assessmentDate: string;
    propertyType: string;
    tenureType: string;
    bedrooms: number;
    bedSpaces: number;
    calibrationWidth: number;
    housingAssociationName?: string;
    entranceLevel?: string;
    internalStairs?: string;
    bathroomLocation?: string;
    secondExit?: string;
    hazards?: string;
    adaptableProperty?: boolean;
    adaptabilityReasoning?: string;
    [key: string]: any;
}

interface AHRData {
    meta_data?: {
        property_address?: string;
        uprn?: string;
        inspection_date?: string;
        overall_grade?: string;
        access_category?: string;
    };
    occupancy?: {
        number_of_bedrooms?: number;
        number_of_bed_spaces?: number;
    };
    eligibility_checks?: {
        entrance_level?: string;
        lifts_servicing_dwelling_count?: number;
        special_equipment?: {
            through_floor_lift?: boolean;
            ceiling_track_hoist?: boolean;
            step_lift?: boolean;
            stair_lift?: boolean;
        };
        level_access_shower_present?: boolean;
    };
    external_access?: {
        communal_front_door?: {
            present?: boolean;
            width_cm?: { value?: number };
            steps_count?: number;
            threshold_height_cm?: { value?: number };
            is_compliant?: boolean;
        };
        property_front_door?: {
            width_cm?: { value?: number };
            steps_count?: number;
            threshold_height_cm?: { value?: number };
            is_compliant?: boolean;
        };
        ramps?: {
            communal?: {
                present?: boolean;
                gradient_ratio?: string;
                width_cm?: { value?: number };
                has_handrails?: boolean;
            };
            property_specific?: {
                present?: boolean;
                gradient_ratio?: string;
                width_cm?: { value?: number };
                has_handrails?: boolean;
            };
        };
        lift_details?: {
            present?: boolean;
            door_clear_opening_cm?: { value?: number };
            internal_length?: number;
            internal_width?: number;
            id?: string;
        };
    };
    vertical_circulation?: {
        internal_stairs?: {
            present?: boolean;
            step_count?: number;
            min_width_cm?: { value?: number };
            type?: string;
            handrails?: string;
        };
        internal_steps?: {
            present?: boolean;
            count?: number;
        };
    };
    facility_distribution?: {
        access_level?: {
            kitchen?: boolean;
            living_room?: boolean;
            bedroom?: boolean;
            wc?: boolean;
            bathroom?: boolean;
        };
        above_access_level?: {
            kitchen?: boolean;
            living_room?: boolean;
            bedroom?: boolean;
            wc?: boolean;
            bathroom?: boolean;
        };
        below_access_level?: {
            kitchen?: boolean;
            living_room?: boolean;
            bedroom?: boolean;
            wc?: boolean;
            bathroom?: boolean;
        };
    };
    internal_doors?: {
        living_room?: { width_cm?: number; compliant?: boolean };
        kitchen?: { width_cm?: number; compliant?: boolean };
        bedroom_1?: { width_cm?: number; compliant?: boolean };
        bathroom?: { width_cm?: number; compliant?: boolean };
        [key: string]: any;
    };
    internal_circulation?: {
        hallway?: {
            min_width_cm?: { value?: number };
            radiators_intruding?: boolean;
            approach_type?: string;
        };
        wheelchair_storage?: {
            present?: boolean;
            dimensions_cm?: { length?: number; width?: number };
            charging_point?: boolean;
        };
    };
    room_analysis?: {
        bathroom?: {
            dimensions_cm?: { area_m2?: number; length?: number; width?: number };
            type?: string;
            combined_with_wc?: boolean;
            turning_circle?: { fits_150cm?: boolean; clearance_pct?: number };
            toilet_transfer_space?: {
                lateral_space_cm?: { value?: number };
                side?: string;
                compliant_75cm?: boolean;
            };
        };
        kitchen?: {
            dimensions_cm?: { area_m2?: number };
            turning_circle?: { fits_150cm?: boolean; clearance_pct?: number };
        };
        toilet?: {
            turning_circle?: { fits_150cm?: boolean; clearance_pct?: number };
            toilet_transfer_space?: {
                lateral_space_cm?: { value?: number };
                side?: string;
                compliant_75cm?: boolean;
            };
        };
    };
    adaptability_assessment?: {
        spatial_feasibility?: { is_feasible?: boolean; score?: number; reasoning?: string };
        structural_feasibility?: { is_feasible?: boolean; score?: number; reasoning?: string };
        overall_verdict?: string;
    };
    risk_register?: Array<{ code?: string; severity?: string; description?: string; action?: string }>;
    context_amenities?: {
        parking?: { designated?: boolean; type?: string };
        proximity?: { shops_lt_100m?: boolean; transport_lt_100m?: boolean; transport_types?: string[] };
        second_exit?: { present?: boolean; steps?: number; ramped?: boolean };
    };
    [key: string]: any;
}

/**
 * Generate a filled PDF from the AHR template
 * @param rawAhr - Gemini AI analysis output
 * @param wizardData - User input from assessment wizard
 * @returns Promise<Blob> - The filled PDF as a Blob
 */
export async function generateAHRPDF(rawAhr: AHRData, wizardData: WizardData, overrides: Record<string, any> = {}): Promise<Blob> {
    try {
        // Load the PDF template from assets
        // In Next.js, files in public/assets are accessed via /assets/...
        const templatePath = '/assets/lahr_property_survey.pdf';

        console.log('[PDF Generator] Loading PDF template from:', templatePath);
        const existingPdfBytes = await fetch(templatePath).then(res => {
            if (!res.ok) {
                throw new Error(`Failed to load PDF template: ${res.status} ${res.statusText}`);
            }
            return res.arrayBuffer();
        });

        // Load PDF document
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        console.log('[PDF Generator] Drawing directly on PDF pages...');

        // Draw text and checkboxes directly on PDF
        await drawOnPDF(pdfDoc, rawAhr, wizardData, overrides);

        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

    } catch (error) {
        console.error('[PDF Generator] Error:', error);
        throw new Error(`Failed to generate PDF: ${error}`);
    }
}

/**
 * Fill PDF by drawing text at specific coordinates
 * Since the PDF has no form fields, we draw directly on the pages
 */
function fillPDFFields(form: PDFForm, rawAhr: AHRData, wizardData: WizardData): void {
    // This function is no longer needed since we'll draw directly on pages
    console.log('[PDF] Note: PDF has no form fields, drawing text directly');
}

/**
 * Draw text on PDF pages at specific coordinates
 * @param pdfDoc - The PDF document
 * @param rawAhr - AI analysis data
 * @param wizardData - User input data
 * @param overrides - User overrides from ReportView
 */
async function drawOnPDF(pdfDoc: PDFDocument, rawAhr: AHRData, wizardData: WizardData, overrides: Record<string, any> = {}): Promise<void> {
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const secondPage = pages[1];
    const thirdPage = pages[2];

    // Load a standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 9;
    const textColor = rgb(0, 0, 0);

    // Helper to get value with override
    const getVal = (key: string, original: any) => {
        return overrides[key] !== undefined ? overrides[key] : original;
    };

    // Helper function to draw text
    const drawText = (text: string | number | undefined | null, x: number, y: number, page = firstPage) => {
        if (text !== undefined && text !== null && text !== '') {
            page.drawText(String(text), {
                x,
                y: page.getHeight() - y, // PDF coordinates start from bottom-left
                size: fontSize,
                font,
                color: textColor,
            });
        }
    };

    // Helper for checkboxes (draw X)
    const drawCheckbox = (checked: boolean | undefined, x: number, y: number, page = firstPage) => {
        if (checked === true) {
            page.drawText('X', {
                x,
                y: page.getHeight() - y,
                size: fontSize,
                font,
                color: textColor,
            });
        }
    };

    // ==== SECTION A: CLIENT & PROPERTY INFORMATION ====
    drawText(getVal('doorNo', wizardData.doorNo), 120, 72);
    drawText(getVal('streetNo', wizardData.streetNo), 280, 72);
    drawText(getVal('buildingName', wizardData.buildingName), 460, 72);
    drawText(getVal('street', wizardData.street), 120, 110);
    drawText(getVal('postcode', wizardData.postcode), 120, 147);
    drawText(getVal('fullName', wizardData.fullName), 450, 147);
    drawText(getVal('phoneNumber', wizardData.phoneNumber), 120, 180);

    const dateStr = getVal('assessmentDate', wizardData.assessmentDate);
    if (dateStr) {
        const date = new Date(dateStr);
        drawText(date.getDate().toString().padStart(2, '0'), 785, 180);
        drawText((date.getMonth() + 1).toString().padStart(2, '0'), 810, 180);
        drawText(date.getFullYear().toString(), 870, 180);
    }

    // ==== SECTION C: GENERAL INFORMATION ====
    const propertyType = (getVal('propertyType', wizardData.propertyType) || '').toLowerCase();
    if (propertyType.includes('house')) drawCheckbox(true, 28, 320);
    if (propertyType.includes('flat')) drawCheckbox(true, 127, 320);
    if (propertyType.includes('maisonette')) drawCheckbox(true, 210, 320);
    if (propertyType.includes('bungalow')) drawCheckbox(true, 342, 320);

    const tenure = (getVal('tenureType', wizardData.tenureType) || '').toLowerCase();
    if (tenure.includes('council')) drawCheckbox(true, 587, 320);
    if (tenure.includes('private')) drawCheckbox(true, 717, 320);
    if (tenure.includes('owner')) drawCheckbox(true, 852, 320);

    const entranceLevel = (getVal('entranceLevel', rawAhr.eligibility_checks?.entrance_level) || '').toLowerCase();
    if (entranceLevel.includes('ground')) drawCheckbox(true, 228, 395);
    if (entranceLevel.includes('basement')) drawCheckbox(true, 315, 395);
    if (entranceLevel === 'other' || entranceLevel.includes('floor')) drawCheckbox(true, 440, 395);

    const lifts = getVal('liftsCount', rawAhr.eligibility_checks?.lifts_servicing_dwelling_count) || 0;
    if (lifts === 0) drawCheckbox(true, 257, 430);
    if (lifts === 1) drawCheckbox(true, 305, 430);
    if (lifts === 2) drawCheckbox(true, 352, 430);
    if (lifts >= 3) drawCheckbox(true, 410, 430);

    const bedrooms = getVal('bedrooms', rawAhr.occupancy?.number_of_bedrooms || wizardData.bedrooms) || 0;
    if (bedrooms >= 0 && bedrooms <= 7) {
        const xPos = [535, 587, 642, 697, 752, 807, 862, 915];
        drawCheckbox(true, xPos[Math.min(bedrooms, 7)], 430);
    }

    const bedSpaces = getVal('bedSpaces', rawAhr.occupancy?.number_of_bed_spaces || wizardData.bedSpaces) || 1;
    if (bedSpaces >= 1 && bedSpaces <= 12) {
        const xPos = [352, 397, 447, 497, 547, 617, 667, 717, 752, 802, 862, 915];
        drawCheckbox(true, xPos[Math.min(bedSpaces - 1, 11)], 465);
    }

    // 2. Major Adaptions
    const equipment = rawAhr.eligibility_checks?.special_equipment;
    const tfl = getVal('throughFloorLift', equipment?.through_floor_lift);
    drawCheckbox(tfl === true, 163, 523);
    drawCheckbox(tfl === false, 213, 523);

    const stepLift = getVal('stepLift', equipment?.step_lift);
    drawCheckbox(stepLift === true, 338, 523);
    drawCheckbox(stepLift === false, 388, 523);

    const stairLift = getVal('stairLift', equipment?.stair_lift);
    drawCheckbox(stairLift === true, 338, 558);
    drawCheckbox(stairLift === false, 388, 558);

    const las = getVal('levelAccessShower', rawAhr.eligibility_checks?.level_access_shower_present);
    drawCheckbox(las === true, 864, 523);
    drawCheckbox(las === false, 918, 523);

    const cth = getVal('ceilingTrackHoist', equipment?.ceiling_track_hoist);
    drawCheckbox(cth === true, 163, 558);
    drawCheckbox(cth === false, 213, 558);

    // ==== SECTION D: EXTERNAL ACCESS ====
    // 3. Communal Front Door
    const hasCommunal = getVal('hasCommunalFrontDoor', rawAhr.external_access?.communal_front_door?.present ?? true);
    drawCheckbox(hasCommunal === true, 33, 705);
    drawCheckbox(hasCommunal === false, 33, 758);

    if (hasCommunal) {
        const communalSteps = getVal('communalFrontDoorSteps', rawAhr.external_access?.communal_front_door?.steps_count) || 0;
        if (communalSteps === 0) drawCheckbox(true, 520, 690);
        else if (communalSteps === 1) drawCheckbox(true, 587, 690);
        else if (communalSteps === 2) drawCheckbox(true, 647, 690);
        else if (communalSteps === 3) drawCheckbox(true, 707, 690);
        else if (communalSteps === 4) drawCheckbox(true, 777, 690);
        else drawCheckbox(true, 842, 690);

        const communalThreshold = getVal('communalFrontDoorThreshold', rawAhr.external_access?.communal_front_door?.threshold_height_cm?.value) || 0;
        if (communalThreshold <= 1.5) drawCheckbox(true, 842, 735);
        else if (communalThreshold < 10) drawCheckbox(true, 607, 735);
        else drawCheckbox(true, 467, 735);

        drawText(getVal('communalFrontDoorWidth', rawAhr.external_access?.communal_front_door?.width_cm?.value), 360, 777);
    }

    // 4. Communal Ramp (Page 2)
    const secondPageX = 33; // Estimated
    const communalRamp = rawAhr.external_access?.ramps?.communal;
    const hasCommunalRamp = getVal('hasCommunalRamp', communalRamp?.present);
    drawCheckbox(hasCommunalRamp === true, 33, 70, secondPage); // Top of Page 2
    drawCheckbox(hasCommunalRamp === false, 33, 110, secondPage);

    if (hasCommunalRamp) {
        drawText(getVal('communalRampGradient', communalRamp?.gradient_ratio), 520, 70, secondPage);
        drawText(getVal('communalRampWidth', communalRamp?.width_cm?.value), 780, 70, secondPage);
        const hasHandrails = getVal('communalRampHandrails', communalRamp?.has_handrails);
        drawCheckbox(hasHandrails === true, 440, 105, secondPage);
        drawCheckbox(hasHandrails === false, 490, 105, secondPage);
    }

    // 5. Communal Lift
    const lift = rawAhr.external_access?.lift_details;
    const hasLift = getVal('hasCommunalLift', lift?.present);
    drawCheckbox(hasLift === true, 33, 160, secondPage);
    drawCheckbox(hasLift === false, 33, 200, secondPage);

    if (hasLift) {
        drawText(getVal('communalLiftWidth', lift?.door_clear_opening_cm?.value), 360, 235, secondPage);
        drawText(getVal('communalLiftLength', lift?.internal_length), 550, 235, secondPage);
        drawText(getVal('communalLiftIntWidth', lift?.internal_width), 800, 235, secondPage);
        drawText(getVal('communalLiftId', lift?.id), 120, 235, secondPage);
    }

    // 6. Property Front Door
    const propDoor = rawAhr.external_access?.property_front_door;
    const propSteps = getVal('propertyFrontDoorSteps', propDoor?.steps_count) || 0;
    if (propSteps === 0) drawCheckbox(true, 520, 290, secondPage);
    else if (propSteps === 1) drawCheckbox(true, 587, 290, secondPage);
    else if (propSteps >= 2) drawCheckbox(true, 647, 290, secondPage); // Just an example mapping

    const propThreshold = getVal('propertyFrontDoorThreshold', propDoor?.threshold_height_cm?.value) || 0;
    if (propThreshold <= 1.5) drawCheckbox(true, 842, 330, secondPage);
    else drawCheckbox(true, 607, 330, secondPage);

    drawText(getVal('propertyFrontDoorWidth', propDoor?.width_cm?.value), 360, 365, secondPage);

    // 7. PropertySpecific Ramp
    const propRamp = rawAhr.external_access?.ramps?.property_specific;
    const hasPropRamp = getVal('hasPropertyRamp', propRamp?.present);
    drawCheckbox(hasPropRamp === true, 33, 410, secondPage);
    drawCheckbox(hasPropRamp === false, 33, 450, secondPage);

    // ==== SECTION E: FACILITIES & CIRCULATION ====
    // 8. Facilities on Access Level
    const accLevel = rawAhr.facility_distribution?.access_level;
    drawCheckbox(getVal('accessLevelKitchen', accLevel?.kitchen), 430, 520, secondPage);
    drawCheckbox(getVal('accessLevelLiving', accLevel?.living_room), 530, 520, secondPage);
    drawCheckbox(getVal('accessLevelBedroom', accLevel?.bedroom), 630, 520, secondPage);
    drawCheckbox(getVal('accessLevelWC', accLevel?.wc), 730, 520, secondPage);
    drawCheckbox(getVal('accessLevelBathroom', accLevel?.bathroom), 830, 520, secondPage);

    // 9. Facilities Above/Below
    const aboveLevel = rawAhr.facility_distribution?.above_access_level;
    drawCheckbox(getVal('aboveLevelBedroom', aboveLevel?.bedroom), 330, 560, secondPage);
    drawCheckbox(getVal('aboveLevelBathroom', aboveLevel?.bathroom), 430, 560, secondPage);

    // 10. Internal Steps/Stairs
    const hasStairs = getVal('hasInternalStairs', rawAhr.vertical_circulation?.internal_stairs?.present);
    drawCheckbox(hasStairs === true, 33, 640, secondPage);
    drawCheckbox(hasStairs === false, 33, 680, secondPage);

    if (hasStairs) {
        drawText(getVal('internalStairsCount', rawAhr.vertical_circulation?.internal_stairs?.step_count), 520, 640, secondPage);
    }

    // 11-13. Second Exit
    const exit = rawAhr.context_amenities?.second_exit;
    const hasSecondExit = getVal('hasSecondExit', exit?.present);
    drawCheckbox(hasSecondExit === true, 33, 760, secondPage);
    drawCheckbox(hasSecondExit === false, 33, 800, secondPage);

    // ==== SECTION F: TECHNICAL SPECIFICATIONS ====
    // 14. Hallway
    const hallway = rawAhr.internal_circulation?.hallway;
    drawText(getVal('hallwayWidth', hallway?.min_width_cm?.value), 360, 70, thirdPage);

    // 15. Storage
    const storage = rawAhr.internal_circulation?.wheelchair_storage;
    drawCheckbox(getVal('hasWheelchairStorage', storage?.present), 33, 140, thirdPage);

    // 16-18. Rooms
    // 19. Separate Toilet
    const toilet = rawAhr.room_analysis?.toilet;
    const toiletTC = getVal('toiletTurningCircle', toilet?.turning_circle?.fits_150cm);
    drawCheckbox(toiletTC === true, 520, 350, thirdPage);
    drawText(getVal('toiletLateralSpace', toilet?.toilet_transfer_space?.lateral_space_cm?.value), 360, 380, thirdPage);

    // 20. Bathroom
    const bathroom = rawAhr.room_analysis?.bathroom;
    drawText(getVal('bathroomArea', bathroom?.dimensions_cm?.area_m2), 360, 420, thirdPage);
    const bathLatSpace = getVal('bathroomLateralSpace', bathroom?.toilet_transfer_space?.lateral_space_cm?.value);
    drawText(bathLatSpace, 360, 480, thirdPage);

    // 22. Parking
    const parking = rawAhr.context_amenities?.parking;
    const parkingDesignated = getVal('parkingDesignated', parking?.designated);
    drawCheckbox(parkingDesignated === true, 520, 550, thirdPage);
    drawCheckbox(parkingDesignated === false, 580, 550, thirdPage);

    // 23. Proximity
    const prox = rawAhr.context_amenities?.proximity;
    const shopsProx = getVal('proximityShops', prox?.shops_lt_100m);
    drawCheckbox(shopsProx === true, 520, 620, thirdPage);
    drawCheckbox(shopsProx === false, 580, 620, thirdPage);

    const transportProx = getVal('proximityTransport', prox?.transport_lt_100m);
    drawCheckbox(transportProx === true, 520, 650, thirdPage);
    drawCheckbox(transportProx === false, 580, 650, thirdPage);

    // Section G: Visual Evidence (Floor Plan)
    const floorPlan = getVal('floorPlan', wizardData.floorPlan);
    if (floorPlan) {
        try {
            console.log('[PDF Generator] Attaching Floor Plan...');
            let imageBytes: ArrayBuffer;
            if (typeof floorPlan === 'string') {
                imageBytes = await fetch(floorPlan).then(res => res.arrayBuffer());
            } else {
                imageBytes = await floorPlan.arrayBuffer();
            }

            const image = floorPlan.toString().toLowerCase().includes('png')
                ? await pdfDoc.embedPng(imageBytes)
                : await pdfDoc.embedJpg(imageBytes);

            const { width, height } = image.scale(0.5);
            const page4 = pages[3] || pdfDoc.addPage([595.28, 841.89]); // A4
            page4.drawText('Section G: VALIDATED FLOOR PLAN', { x: 50, y: 810, size: 12, font, color: rgb(0.3, 0.1, 0.6) });
            page4.drawImage(image, {
                x: 50,
                y: 810 - height - 20,
                width: 500, // Constrain to width
                height: (height / width) * 500,
            });
        } catch (e) {
            console.error('[PDF Generator] Error embedding floor plan:', e);
        }
    }

    // 24. Adaptability & Verdict
    const adaptable = getVal('adaptableProperty', rawAhr.adaptability_assessment?.spatial_feasibility?.is_feasible);
    const lastPage = pages[3] || pages[pages.length - 1];
    drawCheckbox(adaptable === true, 440, 45, lastPage);
    const reasoning = getVal('adaptabilityReasoning', rawAhr.adaptability_assessment?.spatial_feasibility?.reasoning);
    drawText(reasoning, 50, 150, lastPage);

    // Signature
    drawText(getVal('fullName', wizardData.fullName), 50, 250, lastPage);

    console.log('[PDF] Full mapping completed');
}

/**
 * Download the PDF with a dynamic filename
 * @param pdfBlob - The PDF Blob
 * @param fullName - User's full name
 * @param uprn - UPRN identifier
 */
export function downloadPDF(pdfBlob: Blob, fullName: string, uprn: string): void {
    // Sanitize filename
    const sanitizedName = fullName.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedUPRN = uprn.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${sanitizedName}_${sanitizedUPRN}.pdf`;

    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`[PDF Generator] Downloaded: ${fileName}`);
}
