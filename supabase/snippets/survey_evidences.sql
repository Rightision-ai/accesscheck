CREATE TABLE survey_evidences (
  id uuid not null default gen_random_uuid (),
  survey_id       bigint NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- File info
  file_name       text,
  file_type       text,
  mime_type       text not null,              -- e.g. image/jpeg, image/png, application/pdf
  file_url      TEXT not null,                     

  -- Context
  section         text,             -- which form section this relates to e.g. 'D', 'E', 'F'
  field_reference text,            -- e.g. 'communal_ramp', 'bathroom', 'property_front_door'
  caption         TEXT,                    -- optional description by inspector
  constraint survey_evidences_pkey primary key (id),
  constraint survey_evidences_survey_id_fkey foreign KEY (survey_id) references surveys (id) on delete CASCADE
);