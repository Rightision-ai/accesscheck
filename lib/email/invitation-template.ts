import { escapeHtml } from "./contact-template";
import { SUPPORT_EMAIL } from "@/lib/config/support";

/**
 * The invitation email.
 *
 * Written as tables with inline styles because that is what mail clients render reliably —
 * no flexbox, no grid, no external stylesheet, and the call to action is a table cell with
 * a background rather than a styled `<a>`, which Outlook would otherwise strip back to a
 * bare link.
 *
 * Every interpolated value is escaped here rather than at the call site, so a colleague
 * cannot be sent markup by naming their organisation after it.
 */

const BRAND = "#0FB75B";
const BRAND_DARK = "#008900";
const INK = "#0f172a";
const MUTED = "#64748b";
/** The white lockup, absolute so it resolves from a mail client. */
const LOGO_PATH = "/assets/logo/PNG/AcessCheck%20-10.png";
/**
 * Where the logo is served from when the sending deployment cannot serve it itself.
 *
 * An invitation sent from a developer's machine carries a `http://localhost:3000` origin,
 * which no mail client can reach, so the header arrived empty. The link still points at the
 * sending origin — that has to stay local for a local invitation to be acceptable — but the
 * image falls back to the public site.
 */
const PUBLIC_ORIGIN = "https://accesscheck.co.uk";
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/i;

export type InvitationEmail = {
  organisationName: string;
  inviteUrl: string;
  /** Absolute origin of this deployment, for the logo. */
  origin: string;
  /** How long the link lasts, in words. */
  expiresIn?: string;
};

export function buildInvitationEmail({
  organisationName,
  inviteUrl,
  origin,
  expiresIn = "7 days",
}: InvitationEmail): { subject: string; html: string; text: string } {
  const organisation = escapeHtml(organisationName);
  const url = escapeHtml(inviteUrl);
  const base = origin.replace(/\/$/, "");
  const logo = `${LOCAL_ORIGIN.test(base) ? PUBLIC_ORIGIN : base}${LOGO_PATH}`;

  const subject = `Join ${organisationName} on AccessCheck`;

  const text = [
    `You have been invited to join ${organisationName} on AccessCheck.`,
    "",
    "AccessCheck helps housing teams assess, band and plan adaptations for their homes.",
    "",
    `Accept your invitation: ${inviteUrl}`,
    "",
    `This link expires in ${expiresIn}. If you were not expecting this invitation you can safely ignore this email.`,
    "",
    `Questions? Reply to this email or contact ${SUPPORT_EMAIL}.`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f8f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">You have been invited to join ${organisation} on AccessCheck.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e6e8ec;border-radius:18px;overflow:hidden;">
            <tr>
              <td align="center" style="background:${BRAND};background-image:linear-gradient(135deg,${BRAND} 0%,${BRAND_DARK} 100%);padding:36px 24px;">
                <!-- Styled alt text, so a client that blocks remote images still shows the name
                     in white on the green band rather than a broken-image icon. -->
                <img
                  src="${logo}"
                  alt="AccessCheck"
                  width="240"
                  style="display:block;border:0;width:240px;max-width:70%;height:auto;color:#ffffff;font-size:26px;font-weight:800;line-height:44px;"
                />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:40px 32px 8px;">
                <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:800;color:${INK};">
                  You have been invited to ${organisation}
                </h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 40px 0;">
                <p style="margin:0;font-size:16px;line-height:1.6;color:${MUTED};">
                  Accept your invitation to start assessing homes, banding accessibility and
                  planning adaptations with your team.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:32px 32px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background:${BRAND};background-image:linear-gradient(135deg,${BRAND} 0%,${BRAND_DARK} 100%);border-radius:12px;">
                      <a href="${url}" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">
                        Accept invitation
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 40px 0;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
                  This link expires in ${escapeHtml(expiresIn)}.
                </p>
                <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
                  If you were not expecting this invitation, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 40px 32px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Button not working?
                  <a href="${url}" style="color:${BRAND_DARK};font-weight:700;">Click here</a>
                  to accept your invitation.
                </p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #eef2f0;padding:24px 32px;text-align:center;">
                <p style="margin:0;font-size:13px;font-weight:600;color:${MUTED};">
                  Understand accessibility across your homes.
                </p>
                <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">
                  Questions? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_DARK};">${SUPPORT_EMAIL}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
