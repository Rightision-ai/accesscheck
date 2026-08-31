import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { asLooseClient } from "@/lib/supabase/loose";

type OrganisationPermission = "author" | "reviewer" | "admin";

type Invitation = {
  id: string;
  organisation_id: string;
  email: string;
  permissions: OrganisationPermission[];
  expires_at: string;
};

const MIN_PASSWORD_LENGTH = 8;

/**
 * Accept an invitation, creating the account if the invitee does not have one.
 *
 * The account's email always comes from the invitation row, never from the
 * request body — the email-equality check is the entire security model here, so
 * letting the client name the address would let anyone with a link claim it for
 * an arbitrary account.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  } | null;

  const token = body?.token;
  if (!token) return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });

  const service = asLooseClient(createServiceClient());
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitationResult = await service
    .from("organisation_invitations")
    .select("id,organisation_id,email,permissions,expires_at")
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .maybeSingle();

  const invitation = invitationResult.data as Invitation | null;
  if (!invitation) {
    return NextResponse.json({ error: "This invitation is invalid or has already been used." }, { status: 400 });
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invitation has expired. Ask an administrator to send a new one." }, { status: 400 });
  }

  // The cookie-bound client: signing in through it is what actually sets the
  // session cookie on the response.
  const authClient = await createClient();
  const { data: existingAuth } = await authClient.auth.getUser();
  const alreadySignedInAsInvitee =
    existingAuth.user?.email?.toLowerCase() === invitation.email.toLowerCase();

  if (!alreadySignedInAsInvitee) {
    const password = body?.password ?? "";
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 },
      );
    }

    // Clicking the emailed link already proves control of the inbox, so the
    // account is created pre-confirmed rather than sending a second email.
    const created = await createServiceClient().auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
    });
    const alreadyRegistered =
      created.error !== null && /already|registered|exists/i.test(created.error.message);
    if (created.error && !alreadyRegistered) {
      return NextResponse.json({ error: created.error.message }, { status: 400 });
    }

    const signIn = await authClient.auth.signInWithPassword({
      email: invitation.email,
      password,
    });
    if (signIn.error) {
      return NextResponse.json(
        {
          error: alreadyRegistered
            ? "An AccessCheck account already exists for this email. Enter its existing password to accept."
            : signIn.error.message,
        },
        { status: 401 },
      );
    }
  }

  const { data: auth } = await authClient.auth.getUser();
  if (!auth.user?.email || auth.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json({ error: "Sign in with the invited email address." }, { status: 403 });
  }

  const firstName = body?.firstName?.trim() || null;
  const lastName = body?.lastName?.trim() || null;

  // The seat limit is enforced by a trigger on organisation_members, which
  // fires even for the service role. Surface it as a clean 409 rather than a
  // raw Postgres error.
  const memberResult = await service
    .from("organisation_members")
    .upsert(
      {
        organisation_id: invitation.organisation_id,
        user_id: auth.user.id,
        email: auth.user.email,
        status: "active",
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
      },
      { onConflict: "organisation_id,user_id" },
    )
    .select("id")
    .single();

  if (memberResult.error || !memberResult.data) {
    const message = memberResult.error?.message ?? "Unable to create membership.";
    const atCapacity = /limit of \d+ members/i.test(message);
    return NextResponse.json(
      { error: atCapacity ? message : "Unable to create membership." },
      { status: atCapacity ? 409 : 400 },
    );
  }

  const memberId = (memberResult.data as { id: string }).id;
  if (invitation.permissions.length) {
    await service
      .from("organisation_member_permissions")
      .upsert(
        invitation.permissions.map((permission) => ({ member_id: memberId, permission })),
        { onConflict: "member_id,permission" },
      );
  }
  await service
    .from("organisation_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  // Mirror the name into auth metadata so the app shell has it immediately.
  if (firstName || lastName) {
    await authClient.auth.updateUser({
      data: { full_name: [firstName, lastName].filter(Boolean).join(" ") },
    });
  }

  return NextResponse.json({ success: true });
}
