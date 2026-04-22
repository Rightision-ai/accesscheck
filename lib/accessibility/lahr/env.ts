import type { Database } from "@/types/supabase";
import type { RuleEnv } from "./evaluator";

type SurveyRow = Database["public"]["Tables"]["surveys"]["Row"];

type MaybeSurvey = Partial<SurveyRow> | null | undefined;

const YES = "Yes";
const NO = "No";

function yesNo(v: boolean | null | undefined): string | undefined {
  if (v === true) return YES;
  if (v === false) return NO;
  return undefined;
}

function gradientPct(ah: number | null | undefined, al: number | null | undefined): number | undefined {
  if (ah === null || ah === undefined || al === null || al === undefined || al === 0) return undefined;
  return (ah / al) * 100;
}

function rampLengthCm(al: number | null | undefined, bl: number | null | undefined): number | undefined {
  if ((al === null || al === undefined) && (bl === null || bl === undefined)) return undefined;
  return (al ?? 0) + (bl ?? 0);
}

function entryLevelLabel(v: unknown): string | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const raw = String(v);
  const s = raw.toLowerCase();
  if (s.startsWith("ground")) return "Ground";
  if (s.startsWith("basement")) return "Basement";
  if (s.startsWith("upper") || s === "other" || s.startsWith("first") || s.includes("floor")) return "Other";
  return raw;
}

function thresholdLabel(v: unknown): string | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v <= 0) return "Level";
    if (v < 1.5) return "LessThan1_5";
    if (v <= 10) return "10_to_1_5";
    return "MoreThan10";
  }
  const raw = String(v);
  const s = raw.toLowerCase();
  if (s === "level" || s === "0" || s === "<0" || s === "flat") return "Level";
  if (s.includes("<1.5") || s === "lessthan1_5") return "LessThan1_5";
  if (s.includes("1.5") && s.includes("10")) return "10_to_1_5";
  if (s.includes(">10") || s === "morethan10") return "MoreThan10";
  return raw;
}

type StopFlags = Partial<{
  stop_flag_no_lift_or_ramp: boolean | null;
  stop_flag_too_many_steps: boolean | null;
  stop_flag_internal_steps: boolean | null;
  stop_flag_stair_width: boolean | null;
}>;

// Columns added by migration 20260420120000 — not yet in the generated supabase types.
type RampTypeFields = {
  communal_ramp_type?: string | null;
  property_ramp_type?: string | null;
  second_exit_ramp_type?: string | null;
};

export function buildRuleEnv(survey: MaybeSurvey): RuleEnv {
  const s = (survey ?? {}) as MaybeSurvey & RampTypeFields;
  const stops = s as StopFlags;

  const env: RuleEnv = {
    Postcode: s.postcode ?? undefined,
    PropertyOwner: s.tenure_type ?? undefined,
    HousingAssName: s.housing_association_name ?? undefined,
    PropertyEntryLevel: entryLevelLabel(s.entrance_level),
    NoofBedrooms: s.num_bedrooms ?? undefined,
    NoofBeds: s.num_bed_spaces ?? s.num_bedrooms ?? undefined,
    NoofLifts: s.num_lifts_dwelling ?? undefined,
    NumofLift: s.num_lifts_dwelling ?? undefined,

    InternalStairs: yesNo(s.has_internal_stairs ?? null),
    StraightStairs: yesNo(s.has_straight_stairs ?? null),
    CurvedStairs: yesNo(s.has_curved_stairs ?? null),
    WidthofStairs: s.stair_width_cm ?? undefined,
    WidthofStairs1: s.stair_width_cm ?? undefined,
    MoreThan70cm: yesNo(s.stair_70cm_clearance ?? null),
    InternalSteps: s.internal_steps_count ?? undefined,

    CommunalFrontDoor: yesNo(s.has_communal_front_door ?? null),
    CommunalFrontDoorNumSteps: s.communal_door_steps_count ?? undefined,
    CommunalNumSteps: s.communal_door_steps_count ?? undefined,
    CommunalFrontDoorWidth: s.communal_door_opening_width ?? undefined,
    CommunalFrontDoorThreshold: thresholdLabel(s.communal_door_threshold_height),

    CommunalRamp: yesNo(s.has_communal_ramp ?? null),
    CommunalRampPlatform: yesNo(s.communal_ramp_adequate_platform ?? null),
    CommunalRampGradient: gradientPct(s.communal_ramp_ah, s.communal_ramp_al),
    CommunalRampLength: rampLengthCm(s.communal_ramp_al, s.communal_ramp_bl),
    CommunalRampType: s.communal_ramp_type ?? undefined,

    PropertyFrontDoor: yesNo(s.has_property_front_door ?? null),
    PropertyFrontDoorNumSteps: s.property_door_steps_count ?? undefined,
    PropertyNumSteps: s.property_door_steps_count ?? undefined,
    PropertyFrontDoorWidth: s.property_door_opening_width ?? undefined,
    PropertyFrontDoorThreshold: thresholdLabel(s.property_door_threshold_height),

    PropertyRamp: yesNo(s.has_property_ramp ?? null),
    PropertyRampPlatform: yesNo(s.property_ramp_adequate_platform ?? null),
    PropertyRampGradient: gradientPct(s.property_ramp_ah, s.property_ramp_al),
    PropertyRampLength: rampLengthCm(s.property_ramp_al, s.property_ramp_bl),
    PropertyRampType: s.property_ramp_type ?? undefined,

    SecondExit: yesNo(s.has_second_exit ?? null),
    SecondExitAccesstoStreet: yesNo(s.has_second_exit ?? null),
    SecondExitNumSteps: s.second_exit_steps_count ?? undefined,
    SecondExitDoorWidth: s.second_exit_door_width ?? undefined,
    SecondExitThreshold: thresholdLabel(s.second_exit_threshold_height),
    SecondExitRamp: yesNo(s.has_ramped_second_exit ?? null),
    SecondExitRampPlatform: yesNo(s.second_exit_ramp_platform ?? null),
    SecondExitRampGradient: gradientPct(s.second_exit_ramp_ah, s.second_exit_ramp_al),
    SecondExitRampLength: rampLengthCm(s.second_exit_ramp_al, s.second_exit_ramp_bl),
    SecondExitRampType: s.second_exit_ramp_type ?? undefined,

    CommunalLift: yesNo(s.has_communal_lift ?? null),
    DoorOpeningWidth: s.communal_lift_door_width ?? undefined,
    ServicingLiftInternalDimensionsA: s.communal_lift_dim_width ?? undefined,
    ServicingLiftInternalDimensionsB: s.communal_lift_dim_depth ?? undefined,
    ThroughFloorLift: yesNo(s.has_through_floor_lift ?? null),
    ThroughFloorLiftDimensionsA: s.through_floor_lift_dim_width ?? undefined,
    ThroughFloorLiftDimensionsB: s.through_floor_lift_dim_depth ?? undefined,
    PlatformLift: yesNo(s.has_platform_stair_lift ?? null),

    HallwayHead: s.hallway_width_head_on_cm ?? undefined,
    HallwayHead1: s.hallway_width_head_on_cm ?? undefined,
    HallwayTurn: s.hallway_width_turn_cm ?? undefined,
    HallwayTurn1: s.hallway_width_turn_cm ?? undefined,

    BedOne1: s.door_width_bed1 ?? undefined,
    BedTwo1: s.door_width_bed2 ?? undefined,
    BedThree1: s.door_width_bed3 ?? undefined,
    Kitchen1: s.door_width_kitchen ?? undefined,
    Bathroom1: s.door_width_bathroom ?? undefined,
    SeparateToilet1: s.door_width_separate_toilet ?? undefined,
    Lounge1: s.door_width_living_room ?? undefined,

    TurningSpaceWheelchair: yesNo(s.kitchen_turning_150x150 ?? null),
    LargerTurningSpaceWheelchair: yesNo(s.kitchen_turning_170x140 ?? null),
    BathroomTurningSpaceWheelchair: yesNo(s.bathroom_turning_150x150 ?? null),
    LevelAccessShower: yesNo(s.bathroom_has_level_access_shower ?? s.has_level_access_shower ?? null),

    SeparateToilet: yesNo(s.has_separate_toilet ?? null),
    SeparateToiletA: s.toilet_dim_width ?? undefined,
    SeparateToiletB: s.toilet_dim_depth ?? undefined,
    ToiletSideWallSpace: s.toilet_lateral_space_cm ?? undefined,
    CombToiletSideWallSpace: s.bathroom_toilet_lateral_space ?? undefined,

    WheelchairScooterStorage: yesNo(s.has_wheelchair_storage ?? null),
    WheelchairScooterStorageA: s.wheelchair_storage_dim_width ?? undefined,
    WheelchairScooterStorageB: s.wheelchair_storage_dim_depth ?? undefined,

    FacilitiesAccessLevelBed1: s.access_bed1 ?? undefined,
    FacilitiesAccessLevelBed2: s.access_bed2 ?? undefined,
    FacilitiesAccessLevelBathroom: s.access_bathroom_no_toilet ?? undefined,
    FacilitiesAccessLevelSepToilet: s.access_separate_toilet ?? undefined,
    FacilitiesAccessLevelCombBathroom: s.access_combined_bath_toilet ?? undefined,
    FacilitiesAccessLevelCombBathToilet: s.access_combined_bath_toilet ?? undefined,
    FacilitiesAccessLevelLivingRoom: s.access_living_room ?? undefined,
    FacilitiesAccessLevelKitchen: s.access_kitchen ?? undefined,

    NoEntranceGroundandNoLift: yesNo(stops.stop_flag_no_lift_or_ramp ?? null) ?? NO,
    SectionDEnd: yesNo(stops.stop_flag_too_many_steps ?? null) ?? NO,
    SectionEEnd1: yesNo(stops.stop_flag_internal_steps ?? null) ?? NO,
    SectionEEnd2: yesNo(stops.stop_flag_stair_width ?? null) ?? NO,

    OtherPropertiesAssessed: yesNo(s.is_multiple_properties ?? null),
    OtherUPRN_1: undefined,
    OtherUPRN_2: undefined,

    // Used by rules 77/78 via ANY_DOOR_WIDTH(...).
    BedOne: s.door_width_bed1 ?? undefined,
    BedTwo: s.door_width_bed2 ?? undefined,
    Other: s.door_width_bed3 ?? undefined,
    Bathroom: s.door_width_bathroom ?? undefined,
    Kitchen: s.door_width_kitchen ?? undefined,
    Lounge: s.door_width_living_room ?? undefined,

    // `Length` in ramp-gradient sections refers to the current section's ramp length. The
    // classifier swaps this in per-section before evaluating; a shared default is safer than 0.
    Length: undefined,
  };

  return env;
}

export function withSectionLength(env: RuleEnv, lengthCm: number | undefined): RuleEnv {
  return { ...env, Length: lengthCm };
}
