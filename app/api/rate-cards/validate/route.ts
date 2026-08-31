import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import {
  MAX_CSV_BYTES,
  parseRateCardCsv,
  resolveAgainstNational,
} from "@/lib/rate-cards/csv";
import { buildRateCardDiff } from "@/lib/rate-cards/diff";
import { nationalIndicativeCard } from "@/lib/rate-cards/nationalIndicative";
import {
  loadActiveRateCardRef,
  loadRateCardForOrganisation,
} from "@/lib/rate-cards/repository";

/**
 * Dry run: parse, validate and show what publishing would do. Writes nothing.
 *
 * The commit route re-runs exactly this before writing, so the preview cannot drift from what
 * gets stored — the client never sends parsed rows, only the raw file.
 */
export async function POST(request: NextRequest) {
  const context = await requireApiContext("admin");
  if (isApiError(context)) return context;

  const body = (await request.json().catch(() => ({}))) as { csv?: unknown };
  if (typeof body.csv !== "string") {
    return NextResponse.json({ error: "csv is required" }, { status: 400 });
  }
  if (new TextEncoder().encode(body.csv).length > MAX_CSV_BYTES) {
    return NextResponse.json(
      { error: `That file is larger than ${MAX_CSV_BYTES / 1024} KB.` },
      { status: 413 },
    );
  }

  const supabase = await createClient();
  const effective = await loadRateCardForOrganisation(supabase, context.organisationId);
  const national = nationalIndicativeCard();
  const activeCard = await loadActiveRateCardRef(supabase, context.organisationId);

  const parsed = parseRateCardCsv(body.csv);
  const resolved = resolveAgainstNational(parsed.rows, national.itemsByCode);
  const errors = [...parsed.errors, ...resolved.errors].sort(
    (a, b) => (a.line ?? 0) - (b.line ?? 0),
  );

  return NextResponse.json({
    ok: errors.length === 0 && resolved.prepared.length > 0,
    errors,
    warnings: parsed.warnings,
    rowCount: resolved.prepared.length,
    nextVersion: (activeCard?.version ?? 0) + 1,
    diff:
      errors.length === 0
        ? buildRateCardDiff({ prepared: resolved.prepared, effective, national })
        : null,
  });
}
