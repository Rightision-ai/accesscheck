/**
 * Maps all wizard/AI/override data to the surveys table columns (169 columns).
 * Used by both the API route and the server action.
 */

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function bool(v: unknown): boolean | null {
  if (v === true || v === "Y" || v === "Yes") return true;
  if (v === false || v === "N" || v === "No") return false;
  return null;
}

function facilitiesHas(arr: unknown, item: string): boolean {
  if (!Array.isArray(arr)) return false;
  return arr.some((f: string) =>
    f.toLowerCase().replace(/_/g, " ").includes(item.toLowerCase()),
  );
}

export function buildSurveyData(
  wizardData: Record<string, any>,
  overrides: Record<string, any>,
  rawAhr: Record<string, any>,
  caseData: Record<string, any>,
  userId: string,
): Record<string, any> {
  // Mirror ReportView's getVal: override first, then original
  const get = (key: string, original: any) =>
    overrides[key] !== undefined ? overrides[key] : original;

  // Transport types from proximity or overrides
  const transportTypes: string[] =
    get(
      "proximityTransportTypes",
      rawAhr.context_amenities?.proximity?.transport_types,
    ) || [];

  // Facilities arrays
  const accessFacilities = get(
    "facilitiesAccessLevel",
    rawAhr.facility_distribution?.access_level_has ??
      wizardData.facilitiesAccessLevel ??
      [],
  );
  const aboveFacilities = get(
    "facilitiesAboveLevel",
    rawAhr.facility_distribution?.above_access_level_has ??
      wizardData.facilitiesAboveLevel ??
      [],
  );
  const belowFacilities = get(
    "facilitiesBelowLevel",
    rawAhr.facility_distribution?.below_access_level_has ??
      wizardData.facilitiesBelowLevel ??
      [],
  );

  // Stair type resolution
  const stairsType = get(
    "stairsType",
    rawAhr.vertical_circulation?.internal_stairs?.type ??
      (wizardData.internalStairsType === "Straight"
        ? "STRAIGHT"
        : ["Quarter Turn", "Half Turn", "Spiral", "Winding"].includes(
              wizardData.internalStairsType,
            )
          ? "CURVED"
          : undefined),
  );

  return {
    // ── Meta ──
    user_id: userId,
    inspector_name: wizardData.fullName || null,
    inspector_phone: wizardData.phoneNumber || null,
    inspection_date: caseData.assessmentDate || new Date().toISOString(),
    status: caseData.status,
    thumbnail_url: caseData.thumbnail || null,
    raw_ai_data: caseData.mlData,
    compliance_score: caseData.aiScore ?? null,
    overall_grade: caseData.mlData?.aiReport?.Grade || null,
    ai_confidence: 0.9,
    comments: get(
      "adaptabilityReasoning",
      rawAhr.adaptability_assessment?.spatial_feasibility?.reasoning ||
        caseData.description ||
        null,
    ),

    // ── Section A – Address ──
    uprn: rawAhr.meta_data?.uprn || null,
    door_number: wizardData.doorNo || "",
    street_number: wizardData.streetNo || "",
    building_name: wizardData.buildingName || "",
    street: wizardData.street || caseData.address || "",
    postcode: wizardData.postcode || caseData.postcode || "",

    // ── Section B ──
    is_multiple_properties: wizardData.multipleProperties === "Yes",

    // ── Section C – General Info ──
    property_type:
      get(
        "propertyType",
        wizardData.propertyType || rawAhr.property_overview?.type,
      ) || null,
    tenure_type: get("tenureType", wizardData.tenureType) || null,
    housing_association_name:
      get("housingAssociationName", wizardData.housingAssociationName) || null,
    entrance_level:
      get(
        "entranceLevel",
        wizardData.entranceLevel || rawAhr.property_overview?.entrance_level,
      ) || null,
    entrance_floor_level: num(
      get(
        "floorLevel",
        wizardData.floorLevelNumber ?? rawAhr.property_overview?.floor_level,
      ),
    ),
    num_bedrooms: num(
      get(
        "bedroomsCount",
        String(wizardData.bedrooms ?? "") ||
          rawAhr.property_overview?.bedroom_count,
      ),
    ),
    num_bed_spaces: num(
      get("bedSpacesCount", String(wizardData.bedSpaces ?? "")),
    ),
    num_lifts_dwelling: num(
      get(
        "communalLiftServicingCount",
        rawAhr.eligibility_checks?.lifts_servicing_dwelling_count ??
          wizardData.communalLiftCount,
      ),
    ),

    // ── Section C Part 2 – Major Adaptations ──
    has_through_floor_lift: bool(
      get(
        "throughFloorLift",
        rawAhr.eligibility_checks?.special_equipment?.through_floor_lift ??
          wizardData.internalLift === "Through-Floor Lift",
      ),
    ),
    through_floor_lift_dim_width: num(
      get(
        "throughFloorLiftWidth",
        rawAhr.eligibility_checks?.special_equipment
          ?.through_floor_lift_dimensions?.width,
      ),
    ),
    through_floor_lift_dim_depth: num(
      get(
        "throughFloorLiftDepth",
        rawAhr.eligibility_checks?.special_equipment
          ?.through_floor_lift_dimensions?.depth,
      ),
    ),
    has_ceiling_track_hoist: bool(
      get(
        "ceilingTrackHoist",
        rawAhr.eligibility_checks?.special_equipment?.ceiling_track_hoist,
      ),
    ),
    has_step_lift: bool(
      get("stepLift", rawAhr.eligibility_checks?.special_equipment?.step_lift),
    ),
    has_stair_lift: bool(
      get(
        "stairLift",
        rawAhr.eligibility_checks?.special_equipment?.stair_lift ??
          wizardData.internalLift === "Stairlift",
      ),
    ),
    has_platform_stair_lift: bool(
      get(
        "platformLift",
        rawAhr.eligibility_checks?.special_equipment?.platform_lift,
      ),
    ),
    has_level_access_shower: bool(
      get(
        "levelAccessShower",
        rawAhr.eligibility_checks?.level_access_shower_present ??
          wizardData.bathingType?.includes("Level Access"),
      ),
    ),

    // ── Stop Flags ──
    stop_flag_no_lift_or_ramp:
      bool(get("stopTriggered", rawAhr.eligibility_checks?.stop_triggered)) ??
      false,
    stop_flag_too_many_steps: false, // calculated from step counts
    stop_flag_internal_steps:
      Number(
        get(
          "internalStepsCount",
          rawAhr.vertical_circulation?.internal_stairs?.step_count || 0,
        ),
      ) > 0,
    stop_flag_stair_width:
      ((num(
        get(
          "stairsWidth",
          rawAhr.vertical_circulation?.internal_stairs?.min_width_cm?.value ??
            wizardData.stairWidth,
        ),
      ) ?? 999) <= 69.9 &&
        stairsType === "STRAIGHT") ||
      ((num(
        get(
          "stairsWidth",
          rawAhr.vertical_circulation?.internal_stairs?.min_width_cm?.value ??
            wizardData.stairWidth,
        ),
      ) ?? 999) <= 74.9 &&
        stairsType === "CURVED"),
    stop_flag_no_clearance_no_exit:
      get(
        "stairsClearSpaceBottom",
        rawAhr.vertical_circulation?.internal_stairs?.clear_space_bottom_70cm ??
          wizardData.stairBottomClearance === "Y",
      ) === false &&
      get(
        "secondExitAccessToStreet",
        rawAhr.context_amenities?.second_exit?.access_to_street,
      ) === false,

    // ── Section D – External Access ──
    has_communal_front_door: bool(
      get(
        "communalDoorPresent",
        rawAhr.external_access?.communal_front_door?.present ??
          wizardData.communalDoorPresent === "Y",
      ),
    ),
    communal_door_steps_count: num(
      get(
        "communalDoorSteps",
        rawAhr.external_access?.communal_front_door?.steps_count ??
          wizardData.communalStepCount,
      ),
    ),
    communal_door_threshold_height: get("communalDoorThreshold", null) || null,
    communal_door_opening_width: num(
      get(
        "communalDoorWidth",
        rawAhr.external_access?.communal_front_door?.width_cm?.value,
      ),
    ),

    has_communal_ramp: bool(
      get(
        "communalRampPresent",
        rawAhr.external_access?.ramps?.communal?.present,
      ),
    ),
    communal_ramp_adequate_platform: bool(
      get(
        "communalRampAdequatePlatform",
        rawAhr.external_access?.ramps?.communal?.adequate_platform,
      ),
    ),
    communal_ramp_ah: num(
      get(
        "communalRampAHeight",
        rawAhr.external_access?.ramps?.communal?.measurements?.a?.height,
      ),
    ),
    communal_ramp_al: num(
      get(
        "communalRampALength",
        rawAhr.external_access?.ramps?.communal?.measurements?.a?.length,
      ),
    ),
    communal_ramp_bh: num(
      get(
        "communalRampBHeight",
        rawAhr.external_access?.ramps?.communal?.measurements?.b?.height,
      ),
    ),
    communal_ramp_bl: num(
      get(
        "communalRampBLength",
        rawAhr.external_access?.ramps?.communal?.measurements?.b?.length,
      ),
    ),

    has_communal_lift: bool(
      get("communalLiftPresent", rawAhr.external_access?.lift_details?.present),
    ),
    communal_lift_dim_width: num(
      get(
        "communalLiftWidth",
        rawAhr.external_access?.lift_details?.internal_dimensions_cm?.width,
      ),
    ),
    communal_lift_dim_depth: num(
      get(
        "communalLiftDepth",
        rawAhr.external_access?.lift_details?.internal_dimensions_cm?.depth,
      ),
    ),
    communal_lift_door_width: num(
      get(
        "communalLiftDoorWidth",
        rawAhr.external_access?.lift_details?.door_clear_opening_cm?.value,
      ),
    ),
    communal_lift_id: get("communalLiftID1", "") || null,
    communal_lift_count_in_block: num(
      get(
        "communalLiftServicingCount",
        rawAhr.eligibility_checks?.lifts_servicing_dwelling_count ??
          wizardData.communalLiftCount,
      ),
    ),

    // Property door
    property_door_steps_count: num(
      get(
        "propertyDoorSteps",
        rawAhr.external_access?.property_front_door?.steps_count,
      ),
    ),
    property_door_threshold_height: get("propertyDoorThreshold", null) || null,
    property_door_opening_width: num(
      get(
        "propertyDoorWidth",
        rawAhr.external_access?.property_front_door?.width_cm?.value,
      ),
    ),

    has_property_ramp: bool(
      get(
        "propertyRampPresent",
        rawAhr.external_access?.ramps?.property?.present ??
          wizardData.propertyRampPresent === "Y",
      ),
    ),
    property_ramp_adequate_platform: bool(
      get(
        "propertyRampAdequatePlatform",
        rawAhr.external_access?.ramps?.property?.adequate_platform,
      ),
    ),
    property_ramp_ah: num(
      get(
        "propertyRampAHeight",
        rawAhr.external_access?.ramps?.property?.measurements?.a?.height,
      ),
    ),
    property_ramp_al: num(
      get(
        "propertyRampALength",
        rawAhr.external_access?.ramps?.property?.measurements?.a?.length,
      ),
    ),
    property_ramp_bh: num(
      get(
        "propertyRampBHeight",
        rawAhr.external_access?.ramps?.property?.measurements?.b?.height,
      ),
    ),
    property_ramp_bl: num(
      get(
        "propertyRampBLength",
        rawAhr.external_access?.ramps?.property?.measurements?.b?.length,
      ),
    ),

    // ── Section E – Facilities Distribution ──
    access_bed1: facilitiesHas(accessFacilities, "bed 1"),
    access_bed2: facilitiesHas(accessFacilities, "bed 2"),
    access_bathroom_no_toilet: facilitiesHas(accessFacilities, "bathroom"),
    access_combined_bath_toilet: facilitiesHas(
      accessFacilities,
      "combined bath",
    ),
    access_separate_toilet: facilitiesHas(accessFacilities, "separate toilet"),
    access_living_room: facilitiesHas(accessFacilities, "living room"),
    access_kitchen: facilitiesHas(accessFacilities, "kitchen"),
    access_other: facilitiesHas(accessFacilities, "other"),

    above_bed1: facilitiesHas(aboveFacilities, "bed 1"),
    above_bed2: facilitiesHas(aboveFacilities, "bed 2"),
    above_bathroom_no_toilet: facilitiesHas(aboveFacilities, "bathroom"),
    above_combined_bath_toilet: facilitiesHas(aboveFacilities, "combined bath"),
    above_separate_toilet: facilitiesHas(aboveFacilities, "separate toilet"),
    above_living_room: facilitiesHas(aboveFacilities, "living room"),
    above_kitchen: facilitiesHas(aboveFacilities, "kitchen"),
    above_other: facilitiesHas(aboveFacilities, "other"),

    below_bed1: facilitiesHas(belowFacilities, "bed 1"),
    below_bed2: facilitiesHas(belowFacilities, "bed 2"),
    below_bathroom_no_toilet: facilitiesHas(belowFacilities, "bathroom"),
    below_combined_bath_toilet: facilitiesHas(belowFacilities, "combined bath"),
    below_separate_toilet: facilitiesHas(belowFacilities, "separate toilet"),
    below_living_room: facilitiesHas(belowFacilities, "living room"),
    below_kitchen: facilitiesHas(belowFacilities, "kitchen"),
    below_other: facilitiesHas(belowFacilities, "other"),

    // ── Section E – Internal Stairs ──
    internal_steps_count: num(
      get(
        "internalStepsCount",
        rawAhr.vertical_circulation?.internal_stairs?.step_count,
      ),
    ),
    has_internal_stairs: bool(
      get(
        "stairsPresent",
        rawAhr.vertical_circulation?.internal_stairs?.present ??
          wizardData.internalStairs === "Yes",
      ),
    ),
    stair_width_cm: num(
      get(
        "stairsWidth",
        rawAhr.vertical_circulation?.internal_stairs?.min_width_cm?.value ??
          wizardData.stairWidth,
      ),
    ),
    has_straight_stairs: stairsType === "STRAIGHT",
    has_curved_stairs: stairsType === "CURVED",
    stair_70cm_clearance: bool(
      get(
        "stairsClearSpaceBottom",
        rawAhr.vertical_circulation?.internal_stairs?.clear_space_bottom_70cm ??
          wizardData.stairBottomClearance === "Y",
      ),
    ),

    // ── Section E – Second Exit ──
    has_second_exit: bool(
      get(
        "secondExitPresent",
        rawAhr.context_amenities?.second_exit?.present ??
          wizardData.secondExit === "Yes",
      ),
    ),
    second_exit_to_street: bool(
      get(
        "secondExitAccessToStreet",
        rawAhr.context_amenities?.second_exit?.access_to_street ??
          wizardData.secondExitLocation === "Public Way",
      ),
    ),
    second_exit_steps_count: num(
      get("secondExitSteps", rawAhr.context_amenities?.second_exit?.steps),
    ),
    second_exit_threshold_height: get("secondExitThreshold", null) || null,
    second_exit_door_width: num(
      get(
        "secondExitWidth",
        rawAhr.context_amenities?.second_exit?.opening_width_cm,
      ),
    ),
    has_ramped_second_exit: bool(
      get(
        "secondExitRampPresent",
        rawAhr.context_amenities?.second_exit?.ramped,
      ),
    ),
    second_exit_ramp_platform: bool(
      get(
        "secondExitRampAdequatePlatform",
        rawAhr.context_amenities?.second_exit?.ramp_adequate_platform,
      ),
    ),
    second_exit_ramp_ah: num(
      get(
        "secondExitRampAHeight",
        rawAhr.context_amenities?.second_exit?.ramp_measurements?.a?.height,
      ),
    ),
    second_exit_ramp_al: num(
      get(
        "secondExitRampALength",
        rawAhr.context_amenities?.second_exit?.ramp_measurements?.a?.length,
      ),
    ),
    second_exit_ramp_bh: num(
      get(
        "secondExitRampBHeight",
        rawAhr.context_amenities?.second_exit?.ramp_measurements?.b?.height,
      ),
    ),
    second_exit_ramp_bl: num(
      get(
        "secondExitRampBLength",
        rawAhr.context_amenities?.second_exit?.ramp_measurements?.b?.length,
      ),
    ),

    // ── Section E – Garden / Balcony ──
    has_private_garden: bool(
      get(
        "gardenPresent",
        rawAhr.context_amenities?.garden?.present ??
          wizardData.gardenAccess === "Yes",
      ),
    ),
    has_balcony: bool(
      get(
        "balconyPresent",
        rawAhr.context_amenities?.balcony?.present ??
          wizardData.balconyPresent === "Yes",
      ),
    ),
    garden_steps_count: num(
      get("gardenSteps", rawAhr.context_amenities?.garden?.steps),
    ),
    balcony_steps_count: num(
      get("balconySteps", rawAhr.context_amenities?.balcony?.steps),
    ),

    // ── Section F – Hallway ──
    hallway_width_head_on_cm: num(
      get(
        "hallwayMinWidthHeadOn",
        rawAhr.internal_circulation?.hallway?.approach_type === "HEAD_ON"
          ? rawAhr.internal_circulation?.hallway?.min_width_cm?.value
          : wizardData.hallwayWidthHeadOn || null,
      ),
    ),
    hallway_width_turn_cm: num(
      get(
        "hallwayMinWidthTurn",
        rawAhr.internal_circulation?.hallway?.approach_type === "TURN_APPROACH"
          ? rawAhr.internal_circulation?.hallway?.min_width_cm?.value
          : wizardData.hallwayWidthTurn || null,
      ),
    ),

    // ── Section F – Wheelchair Storage ──
    has_wheelchair_storage: bool(
      get(
        "wheelchairStoragePresent",
        rawAhr.internal_circulation?.wheelchair_storage?.present ??
          wizardData.wheelchairStoragePresent === "Y",
      ),
    ),
    wheelchair_storage_dim_width: num(
      get(
        "wheelchairStorageWidth",
        rawAhr.internal_circulation?.wheelchair_storage?.dimensions_cm?.width ??
          wizardData.wheelchairStorageWidthCm,
      ),
    ),
    wheelchair_storage_dim_depth: num(
      get(
        "wheelchairStorageLength",
        rawAhr.internal_circulation?.wheelchair_storage?.dimensions_cm
          ?.length ?? wizardData.wheelchairStorageLengthCm,
      ),
    ),
    wheelchair_charging_socket: bool(
      get(
        "wheelchairStorageCharging",
        rawAhr.internal_circulation?.wheelchair_storage?.charging_point,
      ),
    ),

    // ── Section F – Kitchen ──
    kitchen_turning_150x150: bool(
      get(
        "kitchenTurningSpaceFits150",
        rawAhr.room_analysis?.kitchen?.turning_circle?.fits_150cm ??
          wizardData.kitchenTurningCircle === "Yes",
      ),
    ),
    kitchen_turning_170x140: bool(
      get(
        "kitchenTurningSpaceFits170",
        rawAhr.room_analysis?.kitchen?.turning_circle?.fits_170x140 ??
          wizardData.kitchenTurning170 === "Y",
      ),
    ),
    kitchen_wheelchair_accessible: bool(
      get(
        "kitchenAccessibleUnits",
        rawAhr.room_analysis?.kitchen?.accessible_units ??
          wizardData.kitchenAccessibleUnits === "Y",
      ),
    ),
    kitchen_separate_from_living: bool(
      get(
        "kitchenSeparateToLiving",
        rawAhr.room_analysis?.kitchen?.separate_from_living ??
          wizardData.kitchenSeparateLiving === "Y",
      ),
    ),

    // ── Section F – Separate Toilet ──
    has_separate_toilet: bool(
      get(
        "toiletPresent",
        rawAhr.facility_distribution?.access_level_has?.some?.((f: string) =>
          f.includes("separate_wc"),
        ) ?? wizardData.separateToiletPresent === "Y",
      ),
    ),
    toilet_dim_width: num(get("toiletWidth", null)),
    toilet_dim_depth: num(get("toiletLength", null)),
    toilet_count: num(get("toiletCount", 1)),
    toilet_lateral_space_cm: num(get("toiletLateralSpace", null)),

    // ── Section F – Bathroom ──
    bathroom_turning_150x150: bool(
      get(
        "bathroomTurningSpaceFits150",
        rawAhr.room_analysis?.bathroom?.turning_circle?.fits_150cm ??
          wizardData.bathroomTurning150 === "Y",
      ),
    ),
    bathroom_dim_width: num(
      get(
        "bathroomWidth",
        rawAhr.room_analysis?.bathroom?.dimensions_cm?.width ??
          wizardData.bathroomWidthCm,
      ),
    ),
    bathroom_dim_depth: num(
      get(
        "bathroomLength",
        rawAhr.room_analysis?.bathroom?.dimensions_cm?.length ??
          wizardData.bathroomLengthCm,
      ),
    ),
    bathroom_has_level_access_shower: bool(
      get(
        "bathroomLAShower",
        wizardData.bathingType?.includes("Level Access") ?? false,
      ),
    ),
    bathroom_has_bath: bool(
      get("bathroomBathOnly", wizardData.bathingType === "Bath Only"),
    ),
    bathroom_has_la_shower_and_bath:
      bool(get("bathroomLAShower", false)) &&
      bool(get("bathroomBathOnly", false)),
    bathroom_next_to_toilet: bool(get("bathroomNextToToilet", false)),
    bathroom_toilet_lateral_space: num(
      get(
        "bathroomLateralSpace",
        rawAhr.room_analysis?.bathroom?.lateral_space_cm ??
          wizardData.bathroomLateralSpace,
      ),
    ),

    // ── Section F – Door Opening Widths ──
    door_width_living_room: num(
      get("doorLivingWidth", rawAhr.internal_doors?.living_room?.width_cm),
    ),
    door_width_kitchen: num(
      get("doorKitchenWidth", rawAhr.internal_doors?.kitchen?.width_cm),
    ),
    door_width_bed1: num(
      get("doorBed1Width", rawAhr.internal_doors?.bedroom_1?.width_cm),
    ),
    door_width_bed2: num(get("doorBed2Width", null)),
    door_width_bed3: num(get("doorBed3Width", null)),
    door_width_bathroom: num(
      get("doorBathroomWidth", rawAhr.internal_doors?.bathroom?.width_cm),
    ),
    door_width_separate_toilet: num(get("doorToiletWidth", null)),
    door_width_balcony: num(get("doorBalconyWidth", null)),

    // ── Section F – Parking ──
    has_carport_next_to_property:
      get("parkingType", rawAhr.context_amenities?.parking?.type) ===
      "OFF_STREET",
    has_covered_carport_or_garage: bool(get("parkingCovered", false)),
    has_designated_parking_bay: bool(
      get("parkingDesignated", rawAhr.context_amenities?.parking?.designated),
    ),

    // ── Section F – Proximity ──
    shops_within_100m: bool(
      get("proximityShops", rawAhr.context_amenities?.proximity?.shops_lt_100m),
    ),
    transport_within_100m: bool(
      get(
        "proximityTransport",
        rawAhr.context_amenities?.proximity?.transport_lt_100m,
      ),
    ),
    transport_dlr: transportTypes.includes("DLR"),
    transport_bus: transportTypes.includes("Bus"),
    transport_train: transportTypes.includes("Train"),
    transport_tube: transportTypes.includes("Tube"),

    // ── Summary ──
    can_be_adapted: bool(
      get(
        "adaptableProperty",
        rawAhr.adaptability_assessment?.spatial_feasibility?.is_feasible,
      ),
    ),
  };
}
