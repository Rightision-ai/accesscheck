import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { sendViaResend } from "@/lib/email/resend";
import { buildInvitationEmail } from "@/lib/email/invitation-template";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54);
}

export async function POST(request: NextRequest) {
  const context = await requireApiContext();
  if (isApiError(context)) return context;
  if (!context.isPlatformAdmin)
    return NextResponse.json(
      { error: "Platform administrator access is required." },
      { status: 403 },
    );
  const body = (await request.json()) as {
    name?: string;
    adminEmail?: string;
    contractName?: string;
  };
  const name = body.name?.trim();
  const adminEmail = body.adminEmail?.trim().toLowerCase();
  if (!name || !adminEmail || !/^\S+@\S+\.\S+$/.test(adminEmail))
    return NextResponse.json(
      { error: "Organisation name and initial Admin email are required." },
      { status: 400 },
    );
  const db = asLooseClient(await createClient());
  const slug = `${slugify(name)}-${randomBytes(3).toString("hex")}`;
  const orgResult = await db
    .from("organisations")
    .insert({
      name,
      slug,
      account_type: "council",
      status: "active",
      contract_name: body.contractName?.trim() || "Council Contract",
      support_email: "Shahin@homingo.co.uk",
    })
    .select("*")
    .single();
  if (orgResult.error || !orgResult.data)
    return NextResponse.json(
      { error: orgResult.error?.message ?? "Unable to create organisation." },
      { status: 400 },
    );
  const organisation = orgResult.data as { id: string; name: string };
  const service = createServiceClient();
  const users = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUser = users.data.users.find(
    (user) => user.email?.toLowerCase() === adminEmail,
  );
  let invitationWarning: string | null = null;
  if (existingUser) {
    const memberResult = await db
      .from("organisation_members")
      .insert({
        organisation_id: organisation.id,
        user_id: existingUser.id,
        email: adminEmail,
        status: "active",
      })
      .select("id")
      .single();
    if (memberResult.error || !memberResult.data)
      return NextResponse.json(
        {
          error:
            memberResult.error?.message ??
            "Organisation created, but Admin membership failed.",
        },
        { status: 500 },
      );
    await db
      .from("organisation_member_permissions")
      .insert({
        member_id: (memberResult.data as { id: string }).id,
        permission: "admin",
        granted_by: context.userId,
      });
  } else {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);
    await db
      .from("organisation_invitations")
      .insert({
        organisation_id: organisation.id,
        email: adminEmail,
        permissions: ["admin"],
        token_hash: tokenHash,
        invited_by: context.userId,
        expires_at: expiresAt.toISOString(),
      });
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const inviteUrl = `${origin}/invite/${token}`;
    try {
      await sendViaResend({
        from: process.env.RESEND_FROM || "AccessCheck <noreply@homingo.co.uk>",
        to: [adminEmail],
        // The same branded invitation every other member receives — this one just happens
        // to be for the organisation's first administrator.
        ...buildInvitationEmail({ organisationName: name, inviteUrl, origin }),
      });
    } catch (error) {
      invitationWarning =
        error instanceof Error
          ? error.message
          : "Invitation email was not sent.";
    }
  }
  await db
    .from("organisation_audit_events")
    .insert({
      organisation_id: organisation.id,
      actor_user_id: context.userId,
      action: "organisation.created",
      entity_type: "organisation",
      entity_id: organisation.id,
      metadata: { initial_admin_email: adminEmail },
    });
  return NextResponse.json(
    { organisation, invitationWarning },
    { status: 201 },
  );
}
