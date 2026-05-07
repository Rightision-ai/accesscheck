function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type ContactSubmission = {
  name: string;
  email: string;
  message: string;
};

export function buildContactNotification(s: ContactSubmission) {
  const submittedAt = new Date().toISOString();
  const subject = `New AccessCheck enquiry — ${s.name}`;

  const text = [
    "New enquiry from the AccessCheck contact form.",
    "",
    `Name:    ${s.name}`,
    `Email:   ${s.email}`,
    `Sent:    ${submittedAt}`,
    "",
    "Message:",
    s.message,
    "",
    "— Reply directly to this email to respond to the visitor.",
  ].join("\n");

  const messageHtml = escapeHtml(s.message).replace(/\n/g, "<br />");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1A1A1A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e6e8ec;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#0FB75B;color:#ffffff;padding:18px 24px;font-weight:700;font-size:14px;letter-spacing:.08em;text-transform:uppercase;">
                AccessCheck — new enquiry
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1A1A1A;">
                  ${escapeHtml(s.name)} got in touch
                </h1>
                <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.55;">
                  Reply directly to this email to respond to the visitor — their address is set as the reply-to.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;color:#1A1A1A;margin:0 0 20px;">
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;width:90px;">Name</td>
                    <td style="padding:6px 0;font-weight:600;">${escapeHtml(s.name)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Email</td>
                    <td style="padding:6px 0;font-weight:600;">
                      <a href="mailto:${escapeHtml(s.email)}" style="color:#0FB75B;text-decoration:none;">${escapeHtml(s.email)}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Sent</td>
                    <td style="padding:6px 0;color:#374151;">${escapeHtml(submittedAt)}</td>
                  </tr>
                </table>
                <div style="border-top:1px solid #e6e8ec;padding-top:16px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">
                    Message
                  </p>
                  <div style="background:#f7f8fa;border:1px solid #e6e8ec;border-radius:10px;padding:14px;font-size:14px;line-height:1.6;color:#1A1A1A;">
                    ${messageHtml}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#f7f8fa;padding:14px 24px;font-size:11px;color:#6b7280;border-top:1px solid #e6e8ec;">
                Sent automatically from the AccessCheck contact form.
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
