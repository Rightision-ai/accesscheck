import { NextResponse } from "next/server";
import { sendViaResend } from "@/lib/email/resend";
import { buildContactNotification } from "@/lib/email/contact-template";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    name?: string;
    email?: string;
    message?: string;
    company?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot — humans never see this field; bots fill everything.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const message = body.message?.trim();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (name.length > 200 || email.length > 200 || message.length > 5000) {
    return NextResponse.json({ error: "Field too long" }, { status: 400 });
  }

  const fromAddress = process.env.CONTACT_FROM_EMAIL;
  const toAddress = process.env.CONTACT_TO_EMAIL;
  if (!fromAddress || !toAddress) {
    console.error("[contact] CONTACT_FROM_EMAIL or CONTACT_TO_EMAIL not set");
    return NextResponse.json({ error: "Could not send" }, { status: 500 });
  }

  const { subject, html, text } = buildContactNotification({
    name,
    email,
    message,
  });

  try {
    await sendViaResend({
      from: `AccessCheck <${fromAddress}>`,
      to: [toAddress],
      replyTo: email,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[contact] send failed", err);
    return NextResponse.json({ error: "Could not send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
