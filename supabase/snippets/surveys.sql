CREATE TABLE surveys (
  id bigint generated always as identity not null,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  status text null,
  thumbnail_url text null,

  -- Section A: Property Address
  uprn                  text,          -- Unique Property Reference Number
  door_number           text,
  street_number         text,
  building_name         text,
  street                text,
  postcode              text,

  -- Section A: Inspector Info
  inspector_name        text,
  inspector_phone       text,
  inspection_date       DATE,

  -- Section B: Multiple identical properties flag
  is_multiple_properties BOOLEAN DEFAULT FALSE,

  -- Section C: General Info
  property_type         text,
  tenure_type           text,
  housing_association_name text,       -- if tenure = housing_association
  entrance_level        text,
  entrance_floor_level  SMALLINT,             -- if entrance_level = 'other'
  num_bedrooms          SMALLINT,
  num_bed_spaces        SMALLINT,
  num_lifts_dwelling    SMALLINT DEFAULT 0,   -- lifts servicing the dwelling unit itself

  -- Section C: Major Adaptations
  has_through_floor_lift  BOOLEAN,
  through_floor_lift_dim_width  NUMERIC(5,1), -- cm
  through_floor_lift_dim_depth  NUMERIC(5,1), -- cm
  has_ceiling_track_hoist BOOLEAN,
  has_step_lift           BOOLEAN,
  has_stair_lift          BOOLEAN,
  has_platform_stair_lift BOOLEAN,
  has_level_access_shower BOOLEAN,

  -- Stop flag: above/below ground with no lift/ramp
  stop_flag_no_lift_or_ramp BOOLEAN DEFAULT FALSE,

  -- Section D: Communal Front Door (Q3)
  has_communal_front_door       BOOLEAN,
  communal_door_steps_count     SMALLINT,     -- 0,1,2,3,4,5+
  communal_door_threshold_height text,
  communal_door_opening_width   NUMERIC(5,1), -- cm

  -- Section D: Communal Ramp (Q4)
  has_communal_ramp             BOOLEAN,
  communal_ramp_adequate_platform BOOLEAN,
  communal_ramp_aH              NUMERIC(5,1),
  communal_ramp_aL              NUMERIC(5,1),
  communal_ramp_bH              NUMERIC(5,1),
  communal_ramp_bL              NUMERIC(5,1),

  -- Section D: Communal Lift (Q5)
  has_communal_lift             BOOLEAN,
  communal_lift_dim_width       NUMERIC(5,1),
  communal_lift_dim_depth       NUMERIC(5,1),
  communal_lift_door_width      NUMERIC(5,1),
  communal_lift_id              text,
  communal_lift_count_in_block  SMALLINT,

  -- Section D: Property Front Door (Q6)
  has_property_front_door       BOOLEAN,
  property_door_steps_count     SMALLINT,
  property_door_threshold_height text,
  property_door_opening_width   NUMERIC(5,1),

  -- Stop flag: more than 4 steps at both doors
  stop_flag_too_many_steps      BOOLEAN DEFAULT FALSE,

  -- Section D: Property Ramp (Q7)
  has_property_ramp             BOOLEAN,
  property_ramp_adequate_platform BOOLEAN,
  property_ramp_aH              NUMERIC(5,1),
  property_ramp_aL              NUMERIC(5,1),
  property_ramp_bH              NUMERIC(5,1),
  property_ramp_bL              NUMERIC(5,1),

  -- Section E: Facilities on Access Level (Q8)
  access_bed1                   BOOLEAN,
  access_bed2                   BOOLEAN,
  access_bathroom_no_toilet     BOOLEAN,
  access_combined_bath_toilet   BOOLEAN,
  access_separate_toilet        BOOLEAN,
  access_living_room            BOOLEAN,
  access_kitchen                BOOLEAN,
  access_other                  BOOLEAN,

  -- Section E: Facilities Above Access Level (Q9)
  above_bed1                    BOOLEAN,
  above_bed2                    BOOLEAN,
  above_bathroom_no_toilet      BOOLEAN,
  above_combined_bath_toilet    BOOLEAN,
  above_separate_toilet         BOOLEAN,
  above_living_room             BOOLEAN,
  above_kitchen                 BOOLEAN,
  above_other                   BOOLEAN,

  -- Section E: Facilities Below Access Level (Q10)
  below_bed1                    BOOLEAN,
  below_bed2                    BOOLEAN,
  below_bathroom_no_toilet      BOOLEAN,
  below_combined_bath_toilet    BOOLEAN,
  below_separate_toilet         BOOLEAN,
  below_living_room             BOOLEAN,
  below_kitchen                 BOOLEAN,
  below_other                   BOOLEAN,

  -- Section E: Internal Steps (Q11)
  internal_steps_count          SMALLINT,     -- 0,1,2,3,4,5+
  stop_flag_internal_steps      BOOLEAN DEFAULT FALSE,

  -- Section E: Internal Stairs (Q12)
  has_internal_stairs           BOOLEAN,
  stair_width_cm                NUMERIC(5,1),
  has_straight_stairs           BOOLEAN,
  has_curved_stairs             BOOLEAN,
  stair_70cm_clearance          BOOLEAN,      -- 70cm between bottom stair and front door
  stop_flag_stair_width         BOOLEAN DEFAULT FALSE,
  stop_flag_no_clearance_no_exit BOOLEAN DEFAULT FALSE,

  -- Section E: Second Exit (Q13)
  has_second_exit               BOOLEAN,
  second_exit_to_street         BOOLEAN,
  second_exit_steps_count       SMALLINT,
  second_exit_threshold_height  text,
  second_exit_door_width        NUMERIC(5,1),

  -- Section E: Ramped Second Exit (Q14)
  has_ramped_second_exit        BOOLEAN,
  second_exit_ramp_platform     BOOLEAN,
  second_exit_ramp_aH           NUMERIC(5,1),
  second_exit_ramp_aL           NUMERIC(5,1),
  second_exit_ramp_bH           NUMERIC(5,1),
  second_exit_ramp_bL           NUMERIC(5,1),

  -- Section E: Garden Access (Q15)
  has_private_garden            BOOLEAN,
  has_balcony                   BOOLEAN,
  garden_steps_count            SMALLINT,
  balcony_steps_count           SMALLINT,

  -- Section F: Hallway (Q16)
  hallway_width_head_on_cm      NUMERIC(5,1),
  hallway_width_turn_cm         NUMERIC(5,1),

  -- Section F: Wheelchair & Scooter Storage (Q17)
  has_wheelchair_storage        BOOLEAN,
  wheelchair_storage_dim_width  NUMERIC(5,1),
  wheelchair_storage_dim_depth  NUMERIC(5,1),
  wheelchair_charging_socket    BOOLEAN,

  -- Section F: Kitchen (Q18)
  kitchen_turning_150x150       BOOLEAN,
  kitchen_turning_170x140       BOOLEAN,
  kitchen_wheelchair_accessible BOOLEAN,
  kitchen_separate_from_living  BOOLEAN,

  -- Section F: Separate Toilet (Q19)
  has_separate_toilet           BOOLEAN,
  toilet_dim_width              NUMERIC(5,1),
  toilet_dim_depth              NUMERIC(5,1),
  toilet_count                  SMALLINT,
  toilet_lateral_space_cm       NUMERIC(5,1),

  -- Section F: Bathroom (Q20)
  bathroom_turning_150x150      BOOLEAN,
  bathroom_dim_width            NUMERIC(5,1),
  bathroom_dim_depth            NUMERIC(5,1),
  bathroom_has_level_access_shower BOOLEAN,
  bathroom_has_bath             BOOLEAN,
  bathroom_has_la_shower_and_bath BOOLEAN,
  bathroom_next_to_toilet       BOOLEAN,
  bathroom_toilet_lateral_space NUMERIC(5,1),

  -- Section F: Door Opening Widths (Q21)
  door_width_living_room        NUMERIC(5,1),
  door_width_kitchen            NUMERIC(5,1),
  door_width_bed1               NUMERIC(5,1),
  door_width_bed2               NUMERIC(5,1),
  door_width_bed3               NUMERIC(5,1),
  door_width_bathroom           NUMERIC(5,1),
  door_width_separate_toilet    NUMERIC(5,1),
  door_width_balcony            NUMERIC(5,1),

  -- Section F: Parking (Q22)
  has_carport_next_to_property  BOOLEAN,
  has_covered_carport_or_garage BOOLEAN,
  has_designated_parking_bay    BOOLEAN,

  -- Section F: Proximity to Facilities (Q23)
  shops_within_100m             BOOLEAN,
  transport_within_100m         BOOLEAN,
  transport_dlr                 BOOLEAN,
  transport_bus                 BOOLEAN,
  transport_train               BOOLEAN,
  transport_tube                BOOLEAN,

  -- Summary
  can_be_adapted                BOOLEAN,
  known_hazards                 TEXT,
  comments                      TEXT
);