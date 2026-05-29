# Supabase migrations

Schema is managed entirely through SQL migrations in [`migrations/`](./migrations).
Files are applied in timestamp order (`YYYYMMDDHHMMSS_description.sql`). There is no
ORM — the app reads/writes exclusively through the Supabase **Data API**
(`@supabase/supabase-js` / PostgREST) using the **anon key**, with the
`authenticated` role coming from the user's session JWT.

## Creating a new `public` table — required block

Supabase no longer auto-exposes new `public`-schema tables to the Data API (new
projects from **2026-05-30**, all existing projects from **2026-10-30**). A table
with no explicit `GRANT` is invisible to supabase-js / PostgREST / GraphQL, and
PostgREST returns a `42501` error.

So **every migration that creates a `public` table must, in the same migration**,
grant access and set up row-level security. Use this template:

```sql
CREATE TABLE "public"."your_table" (
  -- columns ...
);

-- Data API grants (Supabase-recommended shape)
GRANT SELECT ON TABLE "public"."your_table" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."your_table" TO "authenticated", "service_role";

-- Row-level security is the real access control — enable it and add policies
ALTER TABLE "public"."your_table" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "your_table_select_own"
  ON "public"."your_table" FOR SELECT TO authenticated
  USING (/* e.g. */ user_id = auth.uid());
-- + insert / update / delete policies as needed
```

Notes:
- `anon` gets **SELECT only**. Only widen it if the table genuinely needs to be
  readable/writable without a logged-in user — and let RLS, not the grant, gate it.
- `service_role` bypasses RLS; grant it CRUD for server-side/admin use.
- A table with no policies + RLS enabled is readable/writable by **no one** through
  the Data API — always add at least one policy.

The grant shape above was standardized across all existing tables in
`20260529120000_standardize_data_api_grants.sql`.

## Migration rules

- **Forward-only.** Never edit a migration that has already been applied to the
  remote project — add a new timestamped migration instead.
- After merging, apply to the remote project with `supabase db push`.
- Verify locally with `supabase db reset`, which replays every migration onto a
  fresh DB (this uses Supabase's new default, so a missing grant fails loudly here).

## Optional hardening

If you want future tables to receive the grants automatically even when the block
above is forgotten, set default privileges for the migration owner role with
`ALTER DEFAULT PRIVILEGES ... GRANT ...`. We intentionally keep grants **explicit
per table** instead, so each table's access is visible and reviewable in its own
migration.
