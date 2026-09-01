import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import type { OrganisationPermission } from "@/types/accesscheck";
import { getSeatUsage, seatLimitMessage } from "@/lib/organisations/seats";

const PERMISSIONS: OrganisationPermission[] = ["author", "reviewer", "admin"];

export async function GET() {
  const context = await requireApiContext(); if (isApiError(context)) return context;
  const db = asLooseClient(await createClient());
  const [members, invitations] = await Promise.all([
    db.from("organisation_members").select("*,organisation_member_permissions(permission,granted_at)").eq("organisation_id", context.organisationId).order("created_at", { ascending: true }),
    db.from("organisation_invitations").select("id,email,permissions,status,expires_at,created_at").eq("organisation_id", context.organisationId).order("created_at", { ascending: false }),
  ]);
  return NextResponse.json({ members: members.data ?? [], invitations: invitations.data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiContext("admin"); if (isApiError(context)) return context;
  const body = (await request.json()) as { memberId?: string; status?: "active" | "inactive"; permissions?: OrganisationPermission[] };
  if (!body.memberId) return NextResponse.json({ error: "Member is required." }, { status: 400 });
  const permissions = [...new Set(body.permissions ?? [])].filter((permission): permission is OrganisationPermission => PERMISSIONS.includes(permission));
  const db = asLooseClient(await createClient());
  const memberResult = await db.from("organisation_members").select("id,user_id,status,organisation_member_permissions(permission)").eq("id", body.memberId).eq("organisation_id", context.organisationId).single();
  if (memberResult.error || !memberResult.data) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  const member = memberResult.data as { id: string; user_id: string; status: string; organisation_member_permissions: Array<{ permission: string }> };
  const wasAdmin = member.organisation_member_permissions.some((role) => role.permission === "admin");
  const removesAdmin = wasAdmin && (!permissions.includes("admin") || body.status === "inactive");
  if (removesAdmin) {
    const adminPermissions = await db.from("organisation_member_permissions").select("member_id,organisation_members!inner(organisation_id,status)").eq("permission", "admin");
    const activeAdmins = ((adminPermissions.data ?? []) as Array<{ organisation_members: { organisation_id: string; status: string } }>).filter((row) => row.organisation_members.organisation_id === context.organisationId && row.organisation_members.status === "active");
    if (activeAdmins.length <= 1) return NextResponse.json({ error: "The organisation must retain at least one active Admin." }, { status: 400 });
  }
  // Reactivating a member consumes a seat. The DB trigger would catch this too,
  // but a checked 409 reads better than a raw Postgres exception.
  if (member.status === "inactive" && body.status === "active") {
    const seats = await getSeatUsage(db, context.organisationId);
    if (seats.isFull) return NextResponse.json({ error: seatLimitMessage(seats.limit) }, { status: 409 });
  }
  if (body.status) await db.from("organisation_members").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", body.memberId);
  // Only the difference is written, and additions go in before removals.
  //
  // Rewriting the whole set — delete everything, insert the new list — locks an admin out of
  // their own organisation. Writing this table requires the caller to hold `admin` (policy
  // organisation_permissions_admin_write), so an admin saving their own row lost that grant on
  // the delete and had every insert rejected by RLS a moment later. The errors were unchecked,
  // so the response still said "Member updated" while the member was left with no permissions
  // at all. Keeping the caller's own admin row in place throughout is what prevents that.
  const current = member.organisation_member_permissions.map((role) => role.permission);
  const added = permissions.filter((permission) => !current.includes(permission));
  const removed = current.filter((permission) => !permissions.includes(permission as OrganisationPermission));
  if (added.length) {
    const insert = await db.from("organisation_member_permissions").insert(added.map((permission) => ({ member_id: body.memberId, permission, granted_by: context.userId })));
    if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 400 });
  }
  if (removed.length) {
    const remove = await db.from("organisation_member_permissions").delete().eq("member_id", body.memberId).in("permission", removed);
    if (remove.error) return NextResponse.json({ error: remove.error.message }, { status: 400 });
  }
  await db.from("organisation_audit_events").insert({ organisation_id: context.organisationId, actor_user_id: context.userId, action: "member.permissions_updated", entity_type: "organisation_member", entity_id: body.memberId, metadata: { status: body.status ?? member.status, permissions } });
  return NextResponse.json({ success: true });
}
