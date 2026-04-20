import { AccessibilityInput, bucketSteps } from "./flowchart";

type AnyRec = Record<string, any>;

const APARTMENT_TYPES = new Set(["Flat", "Maisonette", "Apartment"]);

function firstDefined<T>(...values: (T | null | undefined)[]): T | null {
  for (const v of values) {
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

function asBool(v: unknown): boolean | null {
  if (v === true || v === "Y" || v === "Yes" || v === "true") return true;
  if (v === false || v === "N" || v === "No" || v === "false") return false;
  return null;
}

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Derives the flowchart input shape from a surveys row (post-build) + the
 * raw AHR payload produced by the Gemini pipeline. Accepts either the
 * plain survey row from Supabase or the wizardData/aiReport bundle.
 */
export function deriveAccessibilityInput(args: {
  survey?: AnyRec;
  wizardData?: AnyRec;
  rawAhr?: AnyRec;
}): AccessibilityInput {
  const survey = args.survey ?? {};
  const wizard = args.wizardData ?? {};
  const ahr = args.rawAhr ?? {};
  const ai = wizard.aiSuggestions ?? {};

  const propertyType: string =
    firstDefined<string>(
      survey.property_type,
      wizard.propertyType,
      ahr.property_overview?.type,
    ) ?? "";
  const isApartment = APARTMENT_TYPES.has(propertyType);

  const entranceLevel: string =
    firstDefined<string>(
      survey.entrance_level,
      wizard.entranceLevel,
      ahr.property_overview?.entrance_level,
      ahr.eligibility_checks?.entrance_level,
    ) ?? "";
  const isGroundLevel =
    /ground/i.test(entranceLevel) || entranceLevel === "GROUND";

  const hasElevator =
    asBool(
      firstDefined(
        survey.has_communal_lift,
        ahr.external_access?.lift_details?.present,
        ahr.eligibility_checks?.lifts_servicing_dwelling_count
          ? Number(ahr.eligibility_checks.lifts_servicing_dwelling_count) > 0
          : null,
      ),
    ) ?? false;

  const propertyDoorSteps = asNumber(
    firstDefined(
      survey.property_door_steps_count,
      ahr.external_access?.property_front_door?.steps_count,
    ),
  );
  const communalDoorSteps = asNumber(
    firstDefined(
      survey.communal_door_steps_count,
      ahr.external_access?.communal_front_door?.steps_count,
    ),
  );
  const hasPropertyRamp =
    asBool(firstDefined(survey.has_property_ramp, ahr.external_access?.ramps?.property?.present)) ??
    false;
  const hasCommunalRamp =
    asBool(firstDefined(survey.has_communal_ramp, ahr.external_access?.ramps?.communal?.present)) ??
    false;

  // A ramp with any steps still counts as step-free for classification.
  const rawEntranceSteps =
    propertyDoorSteps !== null ? propertyDoorSteps : communalDoorSteps;
  const entranceSteps =
    (hasPropertyRamp || hasCommunalRamp) && (rawEntranceSteps ?? 0) > 0
      ? bucketSteps(0)
      : bucketSteps(rawEntranceSteps);

  const hasInternalStairs =
    asBool(
      firstDefined(
        survey.has_internal_stairs,
        ahr.vertical_circulation?.internal_stairs?.present,
      ),
    ) ?? false;
  const internalStepsCount = asNumber(
    firstDefined(
      survey.internal_steps_count,
      ahr.vertical_circulation?.internal_stairs?.step_count,
    ),
  );
  const hasStairLift =
    asBool(firstDefined(survey.has_stair_lift, survey.has_through_floor_lift)) ?? false;
  const interiorSteps = hasInternalStairs
    ? hasStairLift
      ? bucketSteps(0)
      : bucketSteps(internalStepsCount)
    : bucketSteps(0);

  const bathroomType: string =
    firstDefined<string>(ahr.room_analysis?.bathroom?.type) ?? "";
  const hasBath =
    asBool(firstDefined(survey.bathroom_has_bath, wizard.bathingType === "Bath Only")) ??
    bathroomType === "BATH_ONLY";
  const hasLevelAccessShower =
    asBool(
      firstDefined(
        survey.has_level_access_shower,
        survey.bathroom_has_level_access_shower,
        ahr.eligibility_checks?.level_access_shower_present,
      ),
    ) ?? bathroomType === "LEVEL_ACCESS_SHOWER";

  const hasOnlyBathtub =
    bathroomType === "BATH_ONLY" || (hasBath && !hasLevelAccessShower);

  const bathtubSuitsWheelchair =
    asBool(
      firstDefined(
        ahr.room_analysis?.bathroom?.bathtub_wheelchair_suitable,
        ai.bathroom_bath_wheelchair_suitable,
        survey.bathroom_bath_wheelchair_suitable,
      ),
    ) ?? false;

  const stepFreeShower =
    hasLevelAccessShower ||
    bathroomType === "LEVEL_ACCESS_SHOWER" ||
    asBool(ahr.room_analysis?.bathroom?.step_free_shower) === true;

  const slipperyFloor =
    asBool(
      firstDefined(
        ahr.room_analysis?.bathroom?.floor_slippery,
        ai.bathroom_floor_slippery,
        survey.bathroom_floor_slippery,
      ),
    ) ?? false;

  return {
    isApartment,
    isGroundLevel,
    hasElevator,
    entranceSteps,
    interiorSteps,
    hasOnlyBathtub,
    bathtubSuitsWheelchair,
    stepFreeShower,
    slipperyFloor,
  };
}
