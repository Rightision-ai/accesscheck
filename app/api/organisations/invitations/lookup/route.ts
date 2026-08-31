import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { asLooseClient } from "@/lib/supabase/loose";

/**
 * Read the minimum needed to render the accept page for a signed-out invitee.
 *
 * Invitation RLS is admin-only, and the visitor is by definition not a member
 * yet, so this has to use the service role — exactly as the accept route does.
 * The emailed token (32 random bytes) is the sole credential; it is never
 * stored, only its SHA-256 hash, so possession of the link is the proof.
 *
 * Returns only what the page displays. Permissions and `invited_by` are
 * deliberately withheld.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });

  const db = asLooseClient(createServiceClient());
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const result = await db
    .from("organisation_invitations")
    .select("email,expires_at,organisation_id")
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .maybeSingle();

  const invitation = result.data as { email: string; expires_at: string; organisation_id: string } | null;
  if (!invitation) {
    return NextResponse.json({ error: "This invitation is invalid or has already been used." }, { status: 404 });
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invitation has expired. Ask an administrator to send a new one." }, { status: 404 });
  }

  const organisation = await db
    .from("organisations")
    .select("name")
    .eq("id", invitation.organisation_id)
    .maybeSingle();

  return NextResponse.json({
    email: invitation.email,
    organisationName: (organisation.data as { name: string } | null)?.name ?? "your council",
    expiresAt: invitation.expires_at,
  });
}
