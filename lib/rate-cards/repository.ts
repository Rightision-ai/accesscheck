import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  NATIONAL_INDICATIVE_CODE,
  NATIONAL_INDICATIVE_LABEL,
  nationalIndicativeCard,
} from "./nationalIndicative";
import { isPatchableColumn } from "@/lib/adaptation-plans/patchWhitelist";
import { indexByCode, type Difficulty, type RateCard, type RateCardItem, type RateCardUnit } from "./types";

/**
 * The generated Row types widen the CHECK-constrained text columns to `string` and jsonb to
 * `Json`. Re-narrow them here, once, so the mapper stays honest about what the table can hold.
 */
type CardRow = Database["public"]["Tables"]["rate_cards"]["Row"];

type ItemRow = Omit<
  Database["public"]["Tables"]["rate_card_items"]["Row"],
  "unit" | "difficulty" | "field_patches"
> & {
  unit: RateCardUnit;
  difficulty: Difficulty;
  field_patches: Record<string, unknown> | null;
};

/**
 * Drop any patch column the classifier does not read.
 *
 * `field_patches` decides whether an adaptation moves a property's band, and nothing validated
 * it at runtime — `PATCHABLE_COLUMNS` existed but had no production caller, so a rate-card row
 * could write an arbitrary key onto the row handed to `classifyLahr`. Uploads inherit their
 * patches and writes are admin-only, so in practice this closes a direct-PostgREST hole rather
 * than an upload one; it is cheap and it is the guarantee the rest of the pipeline assumes.
 */
function safePatches(
  raw: Record<string, unknown> | null,
  context: string,
): Record<string, unknown> {
  const patches: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(raw ?? {})) {
    if (isPatchableColumn(column)) {
      patches[column] = value;
    } else {
      console.warn(
        `[rate-card] ignoring unknown patch column "${column}" on ${context} — the classifier does not read it.`,
      );
    }
  }
  return patches;
}

function toItem(row: ItemRow, card: CardRow): RateCardItem {
  return {
    id: row.id,
    workItemCode: row.work_item_code,
    description: row.description,
    unit: row.unit,
    rateLowGbp: row.rate_low_gbp,
    rateExpectedGbp: row.rate_expected_gbp,
    rateHighGbp: row.rate_high_gbp,
    durationDaysLow: row.duration_days_low,
    durationDaysExpected: row.duration_days_expected,
    durationDaysHigh: row.duration_days_high,
    difficulty: row.difficulty,
    trades: row.trades ?? [],
    addressesRuleNumbers: row.addresses_rule_numbers ?? [],
    preconditions: row.preconditions,
    fieldPatches: safePatches(row.field_patches, `${card.code} v${card.version} / ${row.work_item_code}`),
    priorityHint: row.priority_hint,
    sourceLabel: row.source_label,
    rateCardId: card.id,
    effectiveFrom: card.effective_from,
  };
}

/** Never `*`: rate_cards.source_csv holds the uploaded file, and pulling it out of TOAST on
 *  every plan generation and every case page load would be pure waste. */
const CARD_COLUMNS =
  "id, organisation_id, code, label, version, region_multiplier, effective_from, effective_to, is_active, created_at";
const ITEM_COLUMNS =
  "id, rate_card_id, work_item_code, description, unit, rate_low_gbp, rate_expected_gbp, rate_high_gbp, duration_days_low, duration_days_expected, duration_days_high, difficulty, trades, addresses_rule_numbers, preconditions, field_patches, priority_hint, source_label";

async function loadItems(
  supabase: SupabaseClient<Database>,
  cardIds: string[],
): Promise<ItemRow[]> {
  if (cardIds.length === 0) return [];
  const { data, error } = await supabase
    .from("rate_card_items")
    .select(ITEM_COLUMNS)
    .in("rate_card_id", cardIds)
    .eq("is_active", true);
  if (error) throw new Error(`Failed to load rate card items: ${error.message}`);
  return (data ?? []) as ItemRow[];
}

/**
 * The rate card to price an organisation's adaptation plans against.
 *
 * An organisation's own card does not replace the national one, it **shadows** it per
 * `work_item_code`: an authority that uploads a schedule of rates covering six work items gets
 * their prices for those six and the national indicative figures for the rest, rather than
 * losing coverage for everything they did not price.
 *
 * Falls back to the built-in constant when the database has no national row — so a fresh
 * environment that has not run the seed migration still produces priced plans rather than an
 * entirely unpriced one.
 */
export async function loadRateCardForOrganisation(
  supabase: SupabaseClient<Database>,
  organisationId: string,
): Promise<RateCard> {
  const { data, error } = await supabase
    .from("rate_cards")
    .select(CARD_COLUMNS)
    .or(`organisation_id.eq.${organisationId},organisation_id.is.null`)
    .eq("is_active", true);
  if (error) throw new Error(`Failed to load rate cards: ${error.message}`);

  const cards = (data ?? []) as CardRow[];

  // `rate_cards_one_active_per_scope_idx` should make each of these a single row. The explicit
  // ordering means a future schema regression degrades to "highest version wins" rather than
  // "whichever row PostgREST happened to return first", which is what it used to do.
  const newestFirst = (a: CardRow, b: CardRow) =>
    b.version - a.version || String(b.created_at).localeCompare(String(a.created_at));
  const nationals = cards
    .filter((card) => card.organisation_id === null)
    .sort(
      (a, b) =>
        Number(b.code === NATIONAL_INDICATIVE_CODE) -
          Number(a.code === NATIONAL_INDICATIVE_CODE) || newestFirst(a, b),
    );
  const national = nationals[0];
  const owned = cards
    .filter((card) => card.organisation_id === organisationId)
    .sort(newestFirst)[0];

  if (!national && !owned) return nationalIndicativeCard();

  const rows = await loadItems(
    supabase,
    [national?.id, owned?.id].filter((id): id is string => typeof id === "string"),
  );

  // National first so the organisation's own lines overwrite them by code.
  const merged = new Map<string, RateCardItem>();
  if (national) {
    for (const row of rows.filter((row) => row.rate_card_id === national.id)) {
      merged.set(row.work_item_code, toItem(row, national));
    }
  }
  if (owned) {
    for (const row of rows.filter((row) => row.rate_card_id === owned.id)) {
      merged.set(row.work_item_code, toItem(row, owned));
    }
  }

  const items = [...merged.values()].sort((a, b) =>
    a.priorityHint === b.priorityHint
      ? a.workItemCode.localeCompare(b.workItemCode)
      : a.priorityHint - b.priorityHint,
  );

  if (items.length === 0) return nationalIndicativeCard();

  const primary = owned ?? national!;
  return {
    id: primary.id,
    organisationId: primary.organisation_id,
    code: primary.code,
    label: primary.label ?? NATIONAL_INDICATIVE_LABEL,
    version: owned ? owned.version : null,
    ownedCardId: owned?.id ?? null,
    regionMultiplier: Number(primary.region_multiplier) || 1,
    effectiveFrom: primary.effective_from,
    items,
    itemsByCode: indexByCode(items),
  };
}

/** The organisation's own active card, or null when it is running on national rates alone. */
export type ActiveRateCardRef = {
  id: string;
  code: string;
  version: number;
  label: string;
  effectiveFrom: string;
};

/**
 * Just enough to tell a plan it was priced by a superseded version.
 *
 * A plan stores `rate_card_id`; comparing it against this id is the whole staleness signal, so
 * this deliberately reads one row and five columns rather than the full card.
 */
export async function loadActiveRateCardRef(
  supabase: SupabaseClient<Database>,
  organisationId: string,
): Promise<ActiveRateCardRef | null> {
  const { data, error } = await supabase
    .from("rate_cards")
    .select("id, code, version, label, effective_from")
    .eq("organisation_id", organisationId)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    code: data.code,
    version: data.version,
    label: data.label,
    effectiveFrom: data.effective_from,
  };
}

export type RateCardVersionSummary = ActiveRateCardRef & {
  effectiveTo: string | null;
  isActive: boolean;
  itemCount: number;
  createdAt: string;
  createdBy: string | null;
  /** Set together with `source_csv` on commit, so a non-null filename means the original
   *  upload is downloadable. Seeded rows have neither. */
  sourceFilename: string | null;
};

/** Version history for the settings page, newest first. */
export async function loadRateCardVersions(
  supabase: SupabaseClient<Database>,
  organisationId: string,
): Promise<RateCardVersionSummary[]> {
  const { data, error } = await supabase
    .from("rate_cards")
    // `source_csv` is deliberately absent — the list only needs to know whether one exists.
    .select(
      "id, code, version, label, effective_from, effective_to, is_active, created_at, created_by, source_filename, rate_card_items(count)",
    )
    .eq("organisation_id", organisationId)
    .order("version", { ascending: false });
  if (error) throw new Error(`Failed to load rate card versions: ${error.message}`);

  return (data ?? []).map((row) => {
    const counts = row.rate_card_items as unknown as { count: number }[] | null;
    return {
      id: row.id,
      code: row.code,
      version: row.version,
      label: row.label,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      isActive: row.is_active,
      itemCount: counts?.[0]?.count ?? 0,
      createdAt: row.created_at,
      createdBy: row.created_by,
      sourceFilename: row.source_filename,
    };
  });
}
