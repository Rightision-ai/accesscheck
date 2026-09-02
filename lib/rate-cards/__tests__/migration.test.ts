import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards on the rate-card migrations.
 *
 * `commit_rate_card_version` and `activate_rate_card_version` are PL/pgSQL, so vitest cannot
 * execute them — and a TypeScript re-implementation would only test the re-implementation.
 * What is testable, and what actually broke in review, is the *shape* of the SQL: an ordering,
 * a lock, a clamp and a grant, each of which is a silent correctness bug when it goes missing.
 * Behavioural coverage comes from running the functions against the local database.
 */
const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

function migration(fragment: string): string {
  const name = readdirSync(MIGRATIONS).find((file) => file.includes(fragment));
  if (!name) throw new Error(`No migration matching "${fragment}"`);
  return readFileSync(join(MIGRATIONS, name), "utf8");
}

/**
 * These migrations explain themselves at length, and several comments quote the very SQL the
 * negative assertions below forbid — so a comment would otherwise fail a test the statements
 * pass. Assert on statements only.
 */
function statements(sql: string): string {
  return sql.replace(/--[^\n]*/g, "");
}

const seed = statements(migration("add_rate_cards"));
const versioning = statements(migration("rate_card_versioning"));
const activateFix = statements(migration("fix_activate_rate_card_effective_to"));
const rename = statements(migration("rename_accesscheck_estimation"));

describe("rate card seed migration", () => {
  it("contains exactly one CROSS JOIN (VALUES block", () => {
    // `accesscheckEstimation.test.ts` parses this file positionally over that block. A second one
    // would silently reshuffle its column mapping, so fail loudly here instead.
    const blocks = seed.match(/CROSS JOIN \(VALUES/gi) ?? [];
    expect(blocks).toHaveLength(1);
  });
});

describe("rate card versioning migration", () => {
  it("adds the columns the version history reads", () => {
    for (const column of ["version", "created_by", "source_csv", "source_filename"]) {
      expect(versioning).toContain(column);
    }
  });

  it("widens the old scope uniqueness to include version", () => {
    // Without the drop, a second version of the same card cannot be inserted at all.
    expect(versioning).toMatch(/DROP INDEX IF EXISTS (public\.)?rate_cards_scope_code_idx/i);
    expect(versioning).toMatch(/CREATE UNIQUE INDEX[\s\S]{0,200}code, version/i);
  });

  it("guarantees at most one active card per scope at the database", () => {
    // `loadRateCardForOrganisation` sorts defensively, but the invariant belongs here.
    expect(versioning).toMatch(
      /CREATE UNIQUE INDEX[\s\S]{0,300}rate_cards_one_active_per_scope_idx[\s\S]{0,300}WHERE is_active/i,
    );
  });

  it("bounds the stored CSV", () => {
    expect(versioning).toMatch(/rate_cards_source_csv_size_check/i);
  });

  it("refuses an effective range that ends before it starts", () => {
    expect(versioning).toMatch(/rate_cards_effective_range_check/i);
    expect(versioning).toMatch(/effective_to IS NULL OR effective_to >= effective_from/i);
  });

  it("narrows rate card writes from author to admin", () => {
    // Rates are a procurement decision, not case work. Any surviving 'author' here would leave
    // the old policy in place alongside the new one, and RLS policies OR together.
    expect(versioning).not.toMatch(/'author'/);
    expect(versioning).toMatch(/has_organisation_permission\([^)]*'admin'\)/);
  });

  it("keeps the organisation_id IS NOT NULL clause on every write policy", () => {
    // Without it the national card falls inside an organisation admin's write scope, and one
    // council could re-price every other council's plans.
    const policies = versioning.match(/CREATE POLICY[\s\S]*?;/gi) ?? [];
    // The policies are written `FOR ALL`, which is a write policy — matching on the DML verbs
    // alone found none and made this test vacuously pass.
    const writePolicies = policies.filter((policy) =>
      /FOR ALL|INSERT|UPDATE|DELETE/i.test(policy),
    );
    expect(writePolicies.length).toBeGreaterThan(0);
    for (const policy of writePolicies) {
      expect(policy).toMatch(/organisation_id IS NOT NULL/i);
    }
  });

  it("grants EXECUTE on both functions", () => {
    for (const fn of ["commit_rate_card_version", "activate_rate_card_version"]) {
      expect(versioning).toMatch(
        new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}`, "i"),
      );
    }
  });
});

/**
 * The rename migration recreated `commit_rate_card_version` wholesale to swap the card code in
 * its ordering tiebreak. Asserting the guards only against `versioning` would let a guard
 * dropped during that copy pass silently, so every invariant below runs against both — the
 * original definition and the one actually in force.
 */
describe.each([
  ["versioning migration", versioning],
  ["rename migration", rename],
])("commit_rate_card_version (%s)", (_name, source) => {
  const body = source.slice(source.indexOf("commit_rate_card_version"));

  it("serialises concurrent commits", () => {
    // Two admins publishing at once would otherwise both read the same MAX(version).
    expect(body).toMatch(/pg_advisory_xact_lock/i);
  });

  it("retires the outgoing version before inserting the new one", () => {
    // The one-active partial unique index is checked per statement, not deferred to commit, so
    // inserting first would always violate it.
    const retire = body.search(/SET is_active = false/i);
    const insert = body.search(/INSERT INTO public\.rate_cards/i);
    expect(retire).toBeGreaterThan(-1);
    expect(insert).toBeGreaterThan(-1);
    expect(retire).toBeLessThan(insert);
  });

  it("inherits non-price fields from the AccessCheck estimation rather than the upload", () => {
    // An authority prices work items; it must never be able to change what moves a band.
    expect(body).toMatch(/field_patches/);
    expect(body).toMatch(/addresses_rule_numbers/);
    expect(body).toMatch(/JOIN/i);
  });

  it("refuses a work item code the AccessCheck estimation does not define", () => {
    // Without this an upload could invent a priced line with no rule mapping and no patches.
    expect(body).toMatch(/unknown_codes/i);
    expect(body).toMatch(/RAISE EXCEPTION 'Unknown work item code/i);
  });

  it("runs as the caller so RLS still applies", () => {
    expect(body).toMatch(/SECURITY INVOKER/i);
    expect(body).not.toMatch(/SECURITY DEFINER/i);
  });
});

describe("activate_rate_card_version", () => {
  it("clamps effective_to so a future-dated version cannot retire before it began", () => {
    // The original used COALESCE(effective_to, current_date), which violated
    // rate_cards_effective_range_check when activating an earlier version while a version
    // scheduled to start next April was in force.
    expect(activateFix).toMatch(
      /effective_to\s*=\s*GREATEST\(\s*effective_from,\s*COALESCE\(effective_to,\s*current_date\)\s*\)/i,
    );
    expect(activateFix).not.toMatch(/effective_to\s*=\s*COALESCE\(effective_to,\s*current_date\)/i);
  });

  it("refuses to touch the AccessCheck estimation card", () => {
    // Asserted against the rename migration, which recreated the function last and is therefore
    // the definition actually in force. `activateFix` still carries the pre-rename wording.
    expect(rename).toMatch(/AccessCheck estimation cannot be activated or retired/i);
  });

  it("takes the same lock as the commit path", () => {
    expect(activateFix).toMatch(/pg_advisory_xact_lock/i);
  });

  it("leaves exactly one active version", () => {
    // Deactivate every other active row for the scope, then activate the target — never the
    // other way round, for the same per-statement index reason as the commit path.
    const deactivate = activateFix.search(/SET is_active = false/i);
    const activate = activateFix.search(/SET is_active = true/i);
    expect(deactivate).toBeGreaterThan(-1);
    expect(activate).toBeGreaterThan(deactivate);
    expect(activateFix).toMatch(/id <> target_card_id/i);
  });
});
