/**
 * Only same-origin paths may be used as a post-login destination.
 *
 * The middleware puts the originally requested path in `redirectTo`, which is
 * attacker-controllable via a crafted link. Anything protocol-relative
 * (`//evil.com`) or absolute would be an open redirect.
 *
 * Lives outside `lib/auth/actions.ts` because that file is `'use server'`, and
 * a server-action module may only export async functions.
 */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
