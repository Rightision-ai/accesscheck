import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";

/**
 * Restore an earlier version.
 *
 * The RPC refuses to touch the national card and retires the current version in the same
 * transaction, so there is never a moment with two active cards or none.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await requireApiContext("admin");
  if (isApiError(context)) return context;

  const { id } = await params;
  const supabase = await createClient();

  // Scope the lookup to the caller's organisation before touching it: RLS would refuse the
  // write anyway, but a 404 is the honest answer for another tenant's id.
  const { data: owned } = await supabase
    .from("rate_cards")
    .select("id, version")
    .eq("id", id)
    .eq("organisation_id", context.organisationId)
    .maybeSingle();
  if (!owned) {
    return NextResponse.json({ error: "That version was not found." }, { status: 404 });
  }

  const { data, error } = await supabase.rpc("activate_rate_card_version", {
    target_card_id: id,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const result = data as unknown as { card_id: string; version: number };

  await asLooseClient(supabase).from("organisation_audit_events").insert({
    organisation_id: context.organisationId,
    actor_user_id: context.userId,
    action: "rate_card.version_activated",
    entity_type: "rate_card",
    entity_id: result.card_id,
    metadata: { version: result.version },
  });

  return NextResponse.json({ cardId: result.card_id, version: result.version });
}
