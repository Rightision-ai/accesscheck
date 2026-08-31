export type ResendSendInput = {
  from: string; // e.g. "AccessCheck <noreply@accesscheck.co.uk>"
  to: string[];
  replyTo?: string | string[];
  subject: string;
  html: string;
  text: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendViaResend(input: ResendSendInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      reply_to: input.replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // A 403 here always means the sender domain is not verified for this API
    // key. The raw JSON ends up in a user-facing toast, so say something useful.
    if (res.status === 403) {
      console.error(`Resend rejected a send from "${input.from}": ${detail}`);
      throw new Error(
        `Email could not be sent: the sender domain for "${input.from}" is not verified in Resend. Verify it, or set RESEND_FROM to a verified address.`,
      );
    }
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
}
