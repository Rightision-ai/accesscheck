-- Org-level, editable rate cards — the provenance layer for adaptation-plan costs.
--
-- Until now `cost_gbp` was invented by the model and sanitised to a positive integer. Nothing
-- tied it to a rate, a region, a contractor or a date, so a surveyor could not defend it to a
-- DFG panel. The model's job becomes selecting a work item and a quantity; the price, the
-- duration, the trades and the field patches all come from here.
--
-- `rate_cards.organisation_id IS NULL` is the national indicative card: readable by every
-- authenticated member, writable by nobody through the API (service_role bypasses RLS). An
-- organisation's own card shadows it by work_item_code.
--
-- Mirrored by lib/rate-cards/nationalIndicative.ts. The seed below and that constant are
-- compared element-for-element by lib/rate-cards/__tests__/nationalIndicative.test.ts —
-- change both together.

CREATE TABLE IF NOT EXISTS public.rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  region text,
  region_multiplier numeric(5,3) NOT NULL DEFAULT 1.000 CHECK (region_multiplier > 0),
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- NULL organisation_id must collide with itself, so COALESCE it to a sentinel rather than
-- relying on UNIQUE, which treats NULLs as distinct.
CREATE UNIQUE INDEX IF NOT EXISTS rate_cards_scope_code_idx ON public.rate_cards
  (COALESCE(organisation_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

CREATE TABLE IF NOT EXISTS public.rate_card_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_card_id uuid NOT NULL REFERENCES public.rate_cards(id) ON DELETE CASCADE,
  work_item_code text NOT NULL,
  description text NOT NULL,
  unit text NOT NULL DEFAULT 'each' CHECK (unit IN ('each', 'item', 'm', 'm2', 'hour')),
  rate_low_gbp integer NOT NULL CHECK (rate_low_gbp >= 0),
  rate_expected_gbp integer NOT NULL CHECK (rate_expected_gbp >= 0),
  rate_high_gbp integer NOT NULL CHECK (rate_high_gbp >= 0),
  duration_days_low integer NOT NULL DEFAULT 1 CHECK (duration_days_low >= 0),
  duration_days_expected integer NOT NULL DEFAULT 1 CHECK (duration_days_expected >= 0),
  duration_days_high integer NOT NULL DEFAULT 1 CHECK (duration_days_high >= 0),
  difficulty text NOT NULL CHECK (difficulty IN ('minor', 'moderate', 'major')),
  trades text[] NOT NULL DEFAULT '{}',
  addresses_rule_numbers integer[] NOT NULL DEFAULT '{}',
  preconditions text,
  field_patches jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority_hint integer NOT NULL DEFAULT 100,
  source_label text NOT NULL DEFAULT 'National indicative — obtain quote',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rate_card_id, work_item_code),
  CONSTRAINT rate_card_items_rate_order_check
    CHECK (rate_low_gbp <= rate_expected_gbp AND rate_expected_gbp <= rate_high_gbp),
  CONSTRAINT rate_card_items_duration_order_check
    CHECK (duration_days_low <= duration_days_expected
           AND duration_days_expected <= duration_days_high)
);

CREATE INDEX IF NOT EXISTS rate_card_items_card_idx
  ON public.rate_card_items (rate_card_id);
CREATE INDEX IF NOT EXISTS rate_card_items_rules_idx
  ON public.rate_card_items USING GIN (addresses_rule_numbers);

GRANT SELECT ON TABLE public.rate_cards TO anon;
GRANT SELECT ON TABLE public.rate_card_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_cards TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_card_items TO authenticated, service_role;

ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_card_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rate_cards_org_select ON public.rate_cards;
CREATE POLICY rate_cards_org_select ON public.rate_cards FOR SELECT TO authenticated
  USING (organisation_id IS NULL OR public.is_organisation_member(organisation_id));

-- The `organisation_id IS NOT NULL` clause is load-bearing: without it any author in any
-- organisation could rewrite the shared national card for every other tenant.
DROP POLICY IF EXISTS rate_cards_org_write ON public.rate_cards;
CREATE POLICY rate_cards_org_write ON public.rate_cards FOR ALL TO authenticated
  USING (organisation_id IS NOT NULL
         AND public.has_organisation_permission(organisation_id, 'author'))
  WITH CHECK (organisation_id IS NOT NULL
         AND public.has_organisation_permission(organisation_id, 'author'));

DROP POLICY IF EXISTS rate_card_items_org_select ON public.rate_card_items;
CREATE POLICY rate_card_items_org_select ON public.rate_card_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rate_cards card
    WHERE card.id = rate_card_id
      AND (card.organisation_id IS NULL
           OR public.is_organisation_member(card.organisation_id))));

DROP POLICY IF EXISTS rate_card_items_org_write ON public.rate_card_items;
CREATE POLICY rate_card_items_org_write ON public.rate_card_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rate_cards card
    WHERE card.id = rate_card_id
      AND card.organisation_id IS NOT NULL
      AND public.has_organisation_permission(card.organisation_id, 'author')))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.rate_cards card
    WHERE card.id = rate_card_id
      AND card.organisation_id IS NOT NULL
      AND public.has_organisation_permission(card.organisation_id, 'author')));

-- ─── Seed: the national indicative card ──────────────────────────────────────
-- Carried forward from the adaptation_catalogue seeded by 20260424120000, with three
-- corrections. Each dropped key could never affect a classification:
--   * has_stair_lift            — buildRuleEnv reads only has_platform_stair_lift (env.ts:138)
--   * kitchen_wheelchair_accessible — never read; rule 79 uses the turning-circle booleans
--   * internal_steps_leveller   — omitted entirely: rule 87 is unreachable while env.ts
--                                 hardcodes InternalSteps: 0, and internal_steps_count is the
--                                 STAIR step count driving rules 44-48
-- Rules 3/4/5/6 were added to the ramp items: the ramp patches resolve them, but the original
-- catalogue left them off the rule lists.

INSERT INTO public.rate_cards (organisation_id, code, label, effective_from)
VALUES (NULL, 'national-indicative-2026-04', 'National indicative — obtain quote', DATE '2026-04-01')
ON CONFLICT DO NOTHING;

INSERT INTO public.rate_card_items (
  rate_card_id, work_item_code, description, unit,
  rate_low_gbp, rate_expected_gbp, rate_high_gbp,
  duration_days_low, duration_days_expected, duration_days_high,
  difficulty, trades, addresses_rule_numbers, preconditions, field_patches, priority_hint
)
SELECT card.id, seed.*
FROM public.rate_cards card
CROSS JOIN (VALUES
    ('threshold_ramp', 'Install modular threshold ramp at entrance', 'each',
     250, 450, 900,
     1, 1, 1,
     'minor', ARRAY['carpentry']::text[],
     ARRAY[7, 8, 27, 28]::integer[],
     'Threshold <=10cm and door clearance for ramp lip.',
     '{"communal_door_threshold_height":"Level","property_door_threshold_height":"Level"}'::jsonb, 10),
    ('handrail_install', 'Install stair handrails (both sides) and 70cm clearance', 'each',
     180, 350, 700,
     1, 1, 1,
     'minor', ARRAY['carpentry']::text[],
     ARRAY[85, 86]::integer[],
     'Existing stairs with structurally sound walls.',
     '{"stair_70cm_clearance":true}'::jsonb, 20),
    ('door_widening_entry', 'Widen entrance door(s) to 85cm+', 'each',
     800, 1800, 3500,
     1, 2, 3,
     'moderate', ARRAY['carpentry', 'plastering']::text[],
     ARRAY[25, 26, 42, 43]::integer[],
     'Non-load-bearing door frame; re-hang with wider leaf.',
     '{"communal_door_opening_width":85,"property_door_opening_width":85,"second_exit_door_width":85}'::jsonb, 30),
    ('door_widening_internal', 'Widen internal doors (bedrooms, bathroom, kitchen) to 80cm+', 'each',
     2500, 5000, 9000,
     2, 4, 7,
     'moderate', ARRAY['carpentry', 'plastering', 'decorating']::text[],
     ARRAY[77, 78]::integer[],
     'Non-load-bearing frames; typically 5–7 doors per property.',
     '{"door_width_bed1":80,"door_width_bed2":80,"door_width_bed3":80,"door_width_bathroom":80,"door_width_kitchen":80,"door_width_living_room":80,"door_width_separate_toilet":80}'::jsonb, 40),
    ('ramp_retrofit_property', 'Install property-entrance ramp (1:15, adequate platform)', 'each',
     1800, 3500, 6500,
     1, 2, 4,
     'moderate', ARRAY['groundworks', 'carpentry']::text[],
     ARRAY[2, 3, 4, 6, 17, 18, 19, 20, 21, 22, 23, 24, 93, 101, 104, 107]::integer[],
     'At least 3m clear run-out outside the property door.',
     '{"has_property_ramp":true,"property_ramp_ah":10,"property_ramp_al":200,"property_ramp_adequate_platform":true,"property_ramp_type":"Straight"}'::jsonb, 50),
    ('ramp_retrofit_communal', 'Install communal-entrance ramp (1:15, adequate platform)', 'each',
     2500, 5000, 9000,
     2, 4, 7,
     'major', ARRAY['groundworks', 'carpentry', 'building_control']::text[],
     ARRAY[1, 3, 4, 5, 9, 10, 11, 12, 13, 14, 15, 16, 92, 100, 103, 106]::integer[],
     'Consent required from freeholder / housing association.',
     '{"has_communal_ramp":true,"communal_ramp_ah":10,"communal_ramp_al":200,"communal_ramp_adequate_platform":true,"communal_ramp_type":"Straight"}'::jsonb, 55),
    ('second_exit_ramp_retrofit', 'Install / retrofit second-exit ramp', 'each',
     2000, 3800, 6800,
     2, 3, 5,
     'moderate', ARRAY['groundworks', 'carpentry']::text[],
     ARRAY[29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 94, 102, 105, 108]::integer[],
     'Existing second exit with usable outdoor run-out.',
     '{"has_ramped_second_exit":true,"second_exit_ramp_ah":10,"second_exit_ramp_al":200,"second_exit_ramp_platform":true,"second_exit_ramp_type":"Straight"}'::jsonb, 60),
    ('stair_lift_straight', 'Install straight stair-lift', 'each',
     1500, 3200, 5500,
     1, 1, 2,
     'minor', ARRAY['specialist_lift']::text[],
     ARRAY[44, 45]::integer[],
     'Straight single-flight stairs with clear side fixing.',
     '{"has_platform_stair_lift":true}'::jsonb, 70),
    ('stair_lift_curved', 'Install curved / turning stair-lift', 'each',
     3500, 7000, 12000,
     2, 3, 5,
     'moderate', ARRAY['specialist_lift']::text[],
     ARRAY[44, 45]::integer[],
     'Curved / winding stairs — bespoke rail required.',
     '{"has_platform_stair_lift":true}'::jsonb, 75),
    ('wheelchair_storage_create', 'Create internal wheelchair / scooter storage area', 'each',
     600, 1400, 3200,
     1, 2, 4,
     'moderate', ARRAY['carpentry', 'electrical']::text[],
     ARRAY[53, 54, 55, 56, 57, 58, 59]::integer[],
     'Available hallway / under-stair / porch footprint.',
     '{"has_wheelchair_storage":true,"wheelchair_storage_dim_width":160,"wheelchair_storage_dim_depth":100}'::jsonb, 80),
    ('accessible_wc_install', 'Install ground-floor accessible WC with lateral transfer space', 'each',
     1500, 3200, 5500,
     2, 4, 7,
     'moderate', ARRAY['plumbing', 'carpentry', 'tiling']::text[],
     ARRAY[60, 61, 62, 63, 65, 66, 67, 68, 69, 70, 73]::integer[],
     'Spare floorspace ≈ 2.0 × 1.7m adjacent to soil stack.',
     '{"has_separate_toilet":true,"toilet_dim_width":200,"toilet_dim_depth":170,"toilet_lateral_space_cm":100,"bathroom_toilet_lateral_space":100,"access_separate_toilet":true}'::jsonb, 90),
    ('wet_room_conversion', 'Convert bathroom to level-access wet room with 150cm turning', 'each',
     5500, 8500, 14000,
     5, 7, 12,
     'major', ARRAY['plumbing', 'tiling', 'waterproofing', 'electrical']::text[],
     ARRAY[64, 71, 72]::integer[],
     'Bathroom footprint ≥ 2.5m²; suitable drainage falls.',
     '{"bathroom_has_level_access_shower":true,"has_level_access_shower":true,"bathroom_turning_150x150":true,"bathroom_toilet_lateral_space":100}'::jsonb, 95),
    ('hallway_widening', 'Widen hallway / remove intrusions to 120cm', 'each',
     2500, 5500, 10000,
     4, 7, 14,
     'major', ARRAY['carpentry', 'plastering', 'structural']::text[],
     ARRAY[74, 75, 76, 89]::integer[],
     'Non-load-bearing partition; utilities reroutable.',
     '{"hallway_width_head_on_cm":120,"hallway_width_turn_cm":120}'::jsonb, 100),
    ('kitchen_reconfiguration', 'Reconfigure kitchen for 150 × 150cm turning circle', 'each',
     4500, 8500, 15000,
     5, 10, 15,
     'major', ARRAY['joinery', 'plumbing', 'electrical']::text[],
     ARRAY[79]::integer[],
     'Sufficient floor area to remove peninsula / intruding units.',
     '{"kitchen_turning_150x150":true,"kitchen_turning_170x140":true}'::jsonb, 105),
    ('through_floor_lift', 'Install through-floor lift (access to upper storey)', 'each',
     9500, 15500, 24000,
     5, 7, 14,
     'major', ARRAY['specialist_lift', 'carpentry', 'structural', 'building_control']::text[],
     ARRAY[44, 45, 46, 47, 48]::integer[],
     'Vertical void available; ceiling / floor joists permit aperture.',
     '{"has_through_floor_lift":true,"through_floor_lift_dim_width":110,"through_floor_lift_dim_depth":75}'::jsonb, 110)
) AS seed (work_item_code, description, unit,
           rate_low_gbp, rate_expected_gbp, rate_high_gbp,
           duration_days_low, duration_days_expected, duration_days_high,
           difficulty, trades, addresses_rule_numbers, preconditions, field_patches,
           priority_hint)
WHERE card.organisation_id IS NULL AND card.code = 'national-indicative-2026-04'
ON CONFLICT (rate_card_id, work_item_code) DO NOTHING;
