import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { loadRateCardVersion } from "@/lib/rate-cards/repository";

/**
 * The priced lines of one schedule-of-rates version, for the provenance modal on a plan.
 *
 * Fetched on open rather than shipped with the case page: a plan needs its label and effective
 * date to render, and the 15-plus priced lines behind them only when someone asks "priced from
 * what, exactly?".
 *
 * `cardId` omitted means the plan ran on the AccessCheck estimation alone, which is the card
 * with no organisation. Any other id is scoped by RLS to the caller's own organisation, so a
 * cross-tenant id reads as not found rather than leaking another authority's rates.
 *
 * Read-only, so `author` is the right bar — every member sees the rates their plans are priced
 * from, while publishing a version stays admin-only.
 */
export async function GET(request: NextRequest) {
  const context = await requireApiContext("author");
  if (isApiError(context)) return context;

  const cardId = request.nextUrl.searchParams.get("cardId");
  if (cardId !== null && !UUID.test(cardId)) {
    return NextResponse.json({ error: "cardId must be a uuid" }, { status: 400 });
  }

  const supabase = await createClient();
  const card = await loadRateCardVersion(supabase, cardId);
  if (!card) {
    return NextResponse.json(
      { error: "That schedule of rates was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    label: card.label,
    version: card.version,
    effectiveFrom: card.effectiveFrom,
    regionMultiplier: card.regionMultiplier,
    ownedCardId: card.ownedCardId,
    items: card.items.map((item) => ({
      workItemCode: item.workItemCode,
      description: item.description,
      unit: item.unit,
      rateLowGbp: item.rateLowGbp,
      rateExpectedGbp: item.rateExpectedGbp,
      rateHighGbp: item.rateHighGbp,
      durationDaysExpected: item.durationDaysExpected,
      difficulty: item.difficulty,
      sourceLabel: item.sourceLabel,
      // Which card this line actually came from, so the modal can mark the authority's own
      // prices apart from the estimation figures it inherited.
      isOwn: card.ownedCardId !== null && item.rateCardId === card.ownedCardId,
    })),
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
