import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import {
  MAX_CSV_BYTES,
  ORG_RATE_CARD_CODE,
  parseRateCardCsv,
  resolveAgainstNational,
  toCommitPayload,
} from "@/lib/rate-cards/csv";
import { accesscheckEstimationCard } from "@/lib/rate-cards/accesscheckEstimation";
import {
  loadActiveRateCardRef,
  loadRateCardVersions,
} from "@/lib/rate-cards/repository";

/** Plans still pointing at a superseded version — they keep their prices until regenerated. */
async function countStalePlans(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organisationId: string,
  activeCardId: string | null,
): Promise<number> {
  if (!activeCardId) return 0;
  const { count } = await supabase
    .from("adaptation_plans")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId)
    .not("rate_card_id", "is", null)
    .neq("rate_card_id", activeCardId);
  return count ?? 0;
}

export async function GET() {
  const context = await requireApiContext("admin");
  if (isApiError(context)) return context;

  const supabase = await createClient();
  const [versions, activeCard] = await Promise.all([
    loadRateCardVersions(supabase, context.organisationId),
    loadActiveRateCardRef(supabase, context.organisationId),
  ]);

  return NextResponse.json({
    versions,
    activeCardId: activeCard?.id ?? null,
    stalePlanCount: await countStalePlans(supabase, context.organisationId, activeCard?.id ?? null),
  });
}

/**
 * Publish a new version.
 *
 * The CSV is re-parsed and re-validated here rather than trusting whatever the preview
 * produced, so a stale or tampered client payload cannot commit rows that were never reviewed.
 * The insert itself is one transactional RPC — a client-side sequence that failed partway would
 * leave the organisation with a retired card and no replacement, i.e. no rates at all.
 */
export async function POST(request: NextRequest) {
  const context = await requireApiContext("admin");
  if (isApiError(context)) return context;

  const body = (await request.json().catch(() => ({}))) as {
    csv?: unknown;
    label?: unknown;
    effectiveFrom?: unknown;
    regionMultiplier?: unknown;
    filename?: unknown;
  };

  if (typeof body.csv !== "string" || body.csv.trim() === "") {
    return NextResponse.json({ error: "csv is required" }, { status: 400 });
  }
  if (new TextEncoder().encode(body.csv).length > MAX_CSV_BYTES) {
    return NextResponse.json(
      { error: `That file is larger than ${MAX_CSV_BYTES / 1024} KB.` },
      { status: 413 },
    );
  }
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (label === "") {
    return NextResponse.json(
      { error: "Give the version a name, so a surveyor can tell where a price came from." },
      { status: 400 },
    );
  }
  const effectiveFrom =
    typeof body.effectiveFrom === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.effectiveFrom)
      ? body.effectiveFrom
      : new Date().toISOString().slice(0, 10);
  const regionMultiplier =
    typeof body.regionMultiplier === "number" && body.regionMultiplier > 0
      ? body.regionMultiplier
      : 1;

  const parsed = parseRateCardCsv(body.csv);
  const national = accesscheckEstimationCard();
  const resolved = resolveAgainstNational(parsed.rows, national.itemsByCode);
  const errors = [...parsed.errors, ...resolved.errors];
  if (errors.length > 0 || resolved.prepared.length === 0) {
    return NextResponse.json(
      { error: "That file could not be published — fix the errors and try again.", errors },
      { status: 422 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("commit_rate_card_version", {
    target_organisation_id: context.organisationId,
    card_code: ORG_RATE_CARD_CODE,
    card_label: label.slice(0, 200),
    card_region_multiplier: regionMultiplier,
    card_effective_from: effectiveFrom,
    card_source_csv: body.csv,
    // Always a real name: every published version has an uploaded file behind it, and the
    // version list uses a non-null filename to decide whether to offer the download.
    card_source_filename:
      typeof body.filename === "string" && body.filename.trim() !== ""
        ? body.filename.trim().slice(0, 200)
        : "schedule-of-rates.csv",
    payload: toCommitPayload(resolved.prepared) as never,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const result = data as unknown as {
    card_id: string;
    version: number;
    item_count: number;
  };

  await asLooseClient(supabase).from("organisation_audit_events").insert({
    organisation_id: context.organisationId,
    actor_user_id: context.userId,
    action: "rate_card.version_committed",
    entity_type: "rate_card",
    entity_id: result.card_id,
    metadata: {
      version: result.version,
      itemCount: result.item_count,
      label,
      effectiveFrom,
    },
  });

  return NextResponse.json(
    {
      cardId: result.card_id,
      version: result.version,
      itemCount: result.item_count,
      stalePlanCount: await countStalePlans(
        supabase,
        context.organisationId,
        result.card_id,
      ),
    },
    { status: 201 },
  );
}
