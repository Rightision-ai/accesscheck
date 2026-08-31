import type { LooseClient } from "@/lib/supabase/loose";

export type SeatUsage = {
  activeMembers: number;
  pendingInvitations: number;
  /** Seats consumed: active members plus invitations that have not been accepted yet. */
  used: number;
  limit: number;
  remaining: number;
  isFull: boolean;
};

export const DEFAULT_MEMBER_LIMIT = 5;

/**
 * How many of an organisation's seats are taken.
 *
 * A pending invitation reserves a seat, so an admin cannot invite ten people
 * into five seats and have it fail at accept time — the person clicking the
 * link should never be the one who discovers the organisation is full.
 * Deactivating a member or cancelling an invitation frees the seat at once.
 *
 * Note the database trigger `enforce_organisation_member_limit` counts only
 * ACTIVE members. It is the un-bypassable backstop; the reservation of a seat
 * by a pending invitation is enforced here, in the API.
 */
export async function getSeatUsage(db: LooseClient, organisationId: string): Promise<SeatUsage> {
  const [organisation, members, invitations] = await Promise.all([
    db.from("organisations").select("member_limit").eq("id", organisationId).maybeSingle(),
    db
      .from("organisation_members")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("status", "active"),
    db
      .from("organisation_invitations")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("status", "pending"),
  ]);

  const limit = (organisation.data as { member_limit?: number } | null)?.member_limit ?? DEFAULT_MEMBER_LIMIT;
  const activeMembers = members.count ?? 0;
  const pendingInvitations = invitations.count ?? 0;
  const used = activeMembers + pendingInvitations;
  return {
    activeMembers,
    pendingInvitations,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    isFull: used >= limit,
  };
}

/** The message shown when an organisation has run out of seats. */
export function seatLimitMessage(limit: number): string {
  return `This organisation has reached its limit of ${limit} members. Deactivate a member or cancel a pending invitation to free a seat.`;
}
