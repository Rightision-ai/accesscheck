ALTER TABLE surveys
ADD COLUMN IF NOT EXISTS has_property_front_door BOOLEAN,
ADD COLUMN IF NOT EXISTS known_hazards TEXT;
