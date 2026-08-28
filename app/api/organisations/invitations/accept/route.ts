import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { asLooseClient } from "@/lib/supabase/loose";

export async function POST(request: NextRequest) {
  const { token } = (await request.json()) as { token?: string }; if (!token) return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
  const authClient = await createClient(); const { data: auth } = await authClient.auth.getUser(); if (!auth.user?.email) return NextResponse.json({ error: "Sign in with the invited email first." }, { status: 401 });
  const db = asLooseClient(createServiceClient()); const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitationResult = await db.from("organisation_invitations").select("*").eq("token_hash", tokenHash).eq("status", "pending").single();
  if (invitationResult.error || !invitationResult.data) return NextResponse.json({ error: "Invitation is invalid or no longer active." }, { status: 400 });
  const invitation = invitationResult.data as { id: string; organisation_id: string; email: string; permissions: OrganisationPermission[]; expires_at: string };
  if (new Date(invitation.expires_at) < new Date()) return NextResponse.json({ error: "Invitation has expired." }, { status: 400 });
  if (invitation.email.toLowerCase() !== auth.user.email.toLowerCase()) return NextResponse.json({ error: "Sign in with the invited email address." }, { status: 403 });
  const memberResult = await db.from("organisation_members").upsert({ organisation_id: invitation.organisation_id, user_id: auth.user.id, email: auth.user.email, status: "active" }, { onConflict: "organisation_id,user_id" }).select("id").single();
  if (memberResult.error || !memberResult.data) return NextResponse.json({ error: memberResult.error?.message ?? "Unable to create membership." }, { status: 400 });
  const memberId = (memberResult.data as { id: string }).id;
  if (invitation.permissions.length) await db.from("organisation_member_permissions").upsert(invitation.permissions.map((permission) => ({ member_id: memberId, permission })), { onConflict: "member_id,permission" });
  await db.from("organisation_invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invitation.id);
  return NextResponse.json({ success: true });
}

type OrganisationPermission = "author" | "reviewer" | "admin";
