-- DFG cost-estimation feature.
-- Adds an admin-editable adaptation catalogue and two persistence columns on surveys.

CREATE TABLE IF NOT EXISTS adaptation_catalogue (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  addresses_rule_numbers INT[] NOT NULL DEFAULT '{}',
  cost_gbp_low INT NOT NULL,
  cost_gbp_mid INT NOT NULL,
  cost_gbp_high INT NOT NULL,
  duration_days_low INT NOT NULL,
  duration_days_mid INT NOT NULL,
  duration_days_high INT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('minor', 'moderate', 'major')),
  trades TEXT[] NOT NULL DEFAULT '{}',
  preconditions TEXT,
  field_patches JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority_hint INT NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS adaptation_catalogue_rules_idx
  ON adaptation_catalogue USING GIN (addresses_rule_numbers);

ALTER TABLE adaptation_catalogue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "adaptation_catalogue_read_all" ON adaptation_catalogue;
CREATE POLICY "adaptation_catalogue_read_all"
  ON adaptation_catalogue FOR SELECT TO authenticated USING (true);

-- Persist the latest cost estimation per survey.
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS cost_estimation JSONB,
  ADD COLUMN IF NOT EXISTS cost_estimation_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Keep surveys.updated_at in sync on every row update, EXCEPT when the only
-- thing changing is the cost-estimation bookkeeping itself — otherwise the
-- estimation save would immediately mark itself stale.
CREATE OR REPLACE FUNCTION touch_surveys_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.cost_estimation IS DISTINCT FROM OLD.cost_estimation
      OR NEW.cost_estimation_updated_at IS DISTINCT FROM OLD.cost_estimation_updated_at)
     AND to_jsonb(NEW) - 'cost_estimation' - 'cost_estimation_updated_at' - 'updated_at'
         = to_jsonb(OLD) - 'cost_estimation' - 'cost_estimation_updated_at' - 'updated_at'
  THEN
    NEW.updated_at := OLD.updated_at;
  ELSE
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS surveys_touch_updated_at ON surveys;
CREATE TRIGGER surveys_touch_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION touch_surveys_updated_at();

-- Seed the v1 catalogue. Rule numbers reference lib/accessibility/lahr/tables/business-rules.json.
-- field_patches uses surveys table column names; the planner clones a survey row,
-- merges these patches, and re-runs classifyLahr() to project the post-adaptation band.
INSERT INTO adaptation_catalogue (
  id, label, addresses_rule_numbers,
  cost_gbp_low, cost_gbp_mid, cost_gbp_high,
  duration_days_low, duration_days_mid, duration_days_high,
  difficulty, trades, preconditions, field_patches, priority_hint
) VALUES
  (
    'threshold_ramp',
    'Install modular threshold ramp at entrance',
    ARRAY[7, 8, 27, 28],
    250, 450, 900,
    1, 1, 1,
    'minor',
    ARRAY['carpentry'],
    'Threshold <=10cm and door clearance for ramp lip.',
    '{"communal_door_threshold_height":"Level","property_door_threshold_height":"Level"}'::jsonb,
    10
  ),
  (
    'handrail_install',
    'Install stair handrails (both sides) and 70cm clearance',
    ARRAY[85, 86],
    180, 350, 700,
    1, 1, 1,
    'minor',
    ARRAY['carpentry'],
    'Existing stairs with structurally sound walls.',
    '{"stair_70cm_clearance":true}'::jsonb,
    20
  ),
  (
    'door_widening_entry',
    'Widen entrance door(s) to 85cm+',
    ARRAY[25, 26, 42, 43],
    800, 1800, 3500,
    1, 2, 3,
    'moderate',
    ARRAY['carpentry', 'plastering'],
    'Non-load-bearing door frame; re-hang with wider leaf.',
    '{"communal_door_opening_width":85,"property_door_opening_width":85,"second_exit_door_width":85}'::jsonb,
    30
  ),
  (
    'door_widening_internal',
    'Widen internal doors (bedrooms, bathroom, kitchen) to 80cm+',
    ARRAY[77, 78],
    2500, 5000, 9000,
    2, 4, 7,
    'moderate',
    ARRAY['carpentry', 'plastering', 'decorating'],
    'Non-load-bearing frames; typically 5–7 doors per property.',
    '{"door_width_bed1":80,"door_width_bed2":80,"door_width_bed3":80,"door_width_bathroom":80,"door_width_kitchen":80,"door_width_living_room":80,"door_width_separate_toilet":80}'::jsonb,
    40
  ),
  (
    'ramp_retrofit_property',
    'Install property-entrance ramp (1:15, adequate platform)',
    ARRAY[2, 17, 18, 19, 20, 21, 22, 23, 24, 93, 101, 104, 107],
    1800, 3500, 6500,
    1, 2, 4,
    'moderate',
    ARRAY['groundworks', 'carpentry'],
    'At least 3m clear run-out outside the property door.',
    '{"has_property_ramp":true,"property_ramp_ah":10,"property_ramp_al":200,"property_ramp_adequate_platform":true,"property_ramp_type":"Straight"}'::jsonb,
    50
  ),
  (
    'ramp_retrofit_communal',
    'Install communal-entrance ramp (1:15, adequate platform)',
    ARRAY[1, 9, 10, 11, 12, 13, 14, 15, 16, 92, 100, 103, 106],
    2500, 5000, 9000,
    2, 4, 7,
    'major',
    ARRAY['groundworks', 'carpentry', 'building_control'],
    'Consent required from freeholder / housing association.',
    '{"has_communal_ramp":true,"communal_ramp_ah":10,"communal_ramp_al":200,"communal_ramp_adequate_platform":true,"communal_ramp_type":"Straight"}'::jsonb,
    55
  ),
  (
    'second_exit_ramp_retrofit',
    'Install / retrofit second-exit ramp',
    ARRAY[29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 94, 102, 105, 108],
    2000, 3800, 6800,
    2, 3, 5,
    'moderate',
    ARRAY['groundworks', 'carpentry'],
    'Existing second exit with usable outdoor run-out.',
    '{"has_ramped_second_exit":true,"second_exit_ramp_ah":10,"second_exit_ramp_al":200,"second_exit_ramp_platform":true,"second_exit_ramp_type":"Straight"}'::jsonb,
    60
  ),
  (
    'stair_lift_straight',
    'Install straight stair-lift',
    ARRAY[44, 45],
    1500, 3200, 5500,
    1, 1, 2,
    'minor',
    ARRAY['specialist_lift'],
    'Straight single-flight stairs with clear side fixing.',
    '{"has_platform_stair_lift":true,"has_stair_lift":true}'::jsonb,
    70
  ),
  (
    'stair_lift_curved',
    'Install curved / turning stair-lift',
    ARRAY[44, 45],
    3500, 7000, 12000,
    2, 3, 5,
    'moderate',
    ARRAY['specialist_lift'],
    'Curved / winding stairs — bespoke rail required.',
    '{"has_platform_stair_lift":true,"has_stair_lift":true}'::jsonb,
    75
  ),
  (
    'wheelchair_storage_create',
    'Create internal wheelchair / scooter storage area',
    ARRAY[53, 54, 55, 56, 57, 58, 59],
    600, 1400, 3200,
    1, 2, 4,
    'moderate',
    ARRAY['carpentry', 'electrical'],
    'Available hallway / under-stair / porch footprint.',
    '{"has_wheelchair_storage":true,"wheelchair_storage_dim_width":160,"wheelchair_storage_dim_depth":100}'::jsonb,
    80
  ),
  (
    'accessible_wc_install',
    'Install ground-floor accessible WC with lateral transfer space',
    ARRAY[60, 61, 62, 63, 65, 66, 67, 68, 69, 70, 73],
    1500, 3200, 5500,
    2, 4, 7,
    'moderate',
    ARRAY['plumbing', 'carpentry', 'tiling'],
    'Spare floorspace ≈ 2.0 × 1.7m adjacent to soil stack.',
    '{"has_separate_toilet":true,"toilet_dim_width":200,"toilet_dim_depth":170,"toilet_lateral_space_cm":100,"bathroom_toilet_lateral_space":100,"access_separate_toilet":true}'::jsonb,
    90
  ),
  (
    'wet_room_conversion',
    'Convert bathroom to level-access wet room with 150cm turning',
    ARRAY[64, 71, 72],
    5500, 8500, 14000,
    5, 7, 12,
    'major',
    ARRAY['plumbing', 'tiling', 'waterproofing', 'electrical'],
    'Bathroom footprint ≥ 2.5m²; suitable drainage falls.',
    '{"bathroom_has_level_access_shower":true,"has_level_access_shower":true,"bathroom_turning_150x150":true,"bathroom_toilet_lateral_space":100}'::jsonb,
    95
  ),
  (
    'hallway_widening',
    'Widen hallway / remove intrusions to 120cm',
    ARRAY[74, 75, 76, 89],
    2500, 5500, 10000,
    4, 7, 14,
    'major',
    ARRAY['carpentry', 'plastering', 'structural'],
    'Non-load-bearing partition; utilities reroutable.',
    '{"hallway_width_head_on_cm":120,"hallway_width_turn_cm":120}'::jsonb,
    100
  ),
  (
    'kitchen_reconfiguration',
    'Reconfigure kitchen for 150 × 150cm turning circle',
    ARRAY[79],
    4500, 8500, 15000,
    5, 10, 15,
    'major',
    ARRAY['joinery', 'plumbing', 'electrical'],
    'Sufficient floor area to remove peninsula / intruding units.',
    '{"kitchen_turning_150x150":true,"kitchen_turning_170x140":true,"kitchen_wheelchair_accessible":true}'::jsonb,
    105
  ),
  (
    'through_floor_lift',
    'Install through-floor lift (access to upper storey)',
    ARRAY[44, 45, 46, 47, 48],
    9500, 15500, 24000,
    5, 7, 14,
    'major',
    ARRAY['specialist_lift', 'carpentry', 'structural', 'building_control'],
    'Vertical void available; ceiling / floor joists permit aperture.',
    '{"has_through_floor_lift":true,"through_floor_lift_dim_width":110,"through_floor_lift_dim_depth":75}'::jsonb,
    110
  ),
  (
    'internal_steps_leveller',
    'Remove / infill internal floor-level change',
    ARRAY[87],
    1500, 3500, 7000,
    2, 4, 8,
    'moderate',
    ARRAY['carpentry', 'flooring', 'structural'],
    'Step removable without compromising structure.',
    '{"internal_steps_count":0}'::jsonb,
    115
  )
ON CONFLICT (id) DO NOTHING;
