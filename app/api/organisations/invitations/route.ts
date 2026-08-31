import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { sendViaResend } from "@/lib/email/resend";
import { escapeHtml } from "@/lib/email/contact-template";
import { SUPPORT_EMAIL } from "@/lib/config/support";
import type { OrganisationPermission } from "@/types/accesscheck";

export async function POST(request: NextRequest) {
  const context = await requireApiContext("admin"); if (isApiError(context)) return context;
  const body = (await request.json()) as { email?: string; permissions?: OrganisationPermission[] };
  const email = body.email?.trim().toLowerCase(); if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  const permissions = [...new Set(body.permissions ?? [])].filter((permission) => ["author", "reviewer", "admin"].includes(permission));
  const token = randomBytes(32).toString("base64url"); const tokenHash = createHash("sha256").update(token).digest("hex"); const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  const db = asLooseClient(await createClient());
  const existing = await db.from("organisation_invitations").select("id").eq("organisation_id", context.organisationId).eq("email", email).eq("status", "pending").maybeSingle();
  const insert = existing.data
    ? await db.from("organisation_invitations").update({ permissions, token_hash: tokenHash, invited_by: context.userId, expires_at: expiresAt.toISOString() }).eq("id", (existing.data as { id: string }).id).select("id").single()
    : await db.from("organisation_invitations").insert({ organisation_id: context.organisationId, email, permissions, token_hash: tokenHash, invited_by: context.userId, expires_at: expiresAt.toISOString() }).select("id").single();
  if (insert.error || !insert.data) return NextResponse.json({ error: insert.error?.message ?? "Unable to create invitation." }, { status: 400 });
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin; const inviteUrl = `${origin}/invite/${token}`;
  const organisationName = escapeHtml(context.organisationName);
  try {
    // rightision.co.uk is the domain verified in Resend; accesscheck.co.uk is not,
    // and sending from an unverified domain fails with a 403.
    await sendViaResend({ from: process.env.RESEND_FROM || "AccessCheck <noreply@rightision.co.uk>", to: [email], replyTo: SUPPORT_EMAIL, subject: `Join ${context.organisationName} on AccessCheck`, text: `You have been invited to ${context.organisationName} on AccessCheck. Accept your invitation: ${inviteUrl}`, html: `<p>You have been invited to <strong>${organisationName}</strong> on AccessCheck.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>This link expires in 7 days.</p>` });
  } catch (error) {
    await db.from("organisation_invitations").delete().eq("id", (insert.data as { id: string }).id);
    return NextResponse.json({ error: error instanceof Error ? `Invitation was not sent: ${error.message}` : "Invitation was not sent." }, { status: 502 });
  }
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiContext("admin"); if (isApiError(context)) return context;
  const body = (await request.json()) as { invitationId?: string; action?: "cancel" };
  if (!body.invitationId || body.action !== "cancel") return NextResponse.json({ error: "Invalid invitation action." }, { status: 400 });
  const db = asLooseClient(await createClient()); const result = await db.from("organisation_invitations").update({ status: "cancelled" }).eq("id", body.invitationId).eq("organisation_id", context.organisationId);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 }); return NextResponse.json({ success: true });
}
