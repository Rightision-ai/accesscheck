"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrors({});
    setMessage("");

    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = (fd.get("name") as string)?.trim();
    const email = (fd.get("email") as string)?.trim();
    const body = (fd.get("message") as string)?.trim();
    const company = (fd.get("company") as string) ?? "";

    const next: Record<string, string> = {};
    if (!name) next.name = "Please enter your name.";
    if (!email) next.email = "Please enter your email.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Please enter a valid email.";
    if (!body) next.message = "Please enter a message.";
    if (Object.keys(next).length) {
      setErrors(next);
      setStatus("error");
      setMessage("Please fix the highlighted fields and try again.");
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, message: body, company }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      setMessage("Thanks — we’ve received your message and will be in touch.");
      form.reset();
    } catch {
      setStatus("error");
      setMessage("Sorry, something went wrong sending your message. Please try again or email us directly.");
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-[var(--text-main)]">
          Name <span className="text-[var(--text-dim)] font-normal">(required)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          className="mt-1 w-full min-h-11 px-4 rounded-lg border border-[var(--border)] bg-white text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)]"
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-700">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-[var(--text-main)]">
          Email <span className="text-[var(--text-dim)] font-normal">(required)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="mt-1 w-full min-h-11 px-4 rounded-lg border border-[var(--border)] bg-white text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)]"
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-700">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-[var(--text-main)]">
          How can we help? <span className="text-[var(--text-dim)] font-normal">(required)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "message-error" : "message-help"}
          className="mt-1 w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-white text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)]"
        />
        {errors.message ? (
          <p id="message-error" className="mt-1 text-sm text-red-700">
            {errors.message}
          </p>
        ) : (
          <p id="message-help" className="mt-1 text-xs text-[var(--text-dim)]">
            Tell us a bit about your team and what you’re trying to assess.
          </p>
        )}
      </div>

      {/* Honeypot — humans never see this; bots fill all fields and get rejected. */}
      <div aria-hidden="true" className="hidden" tabIndex={-1}>
        <label>
          Company
          <input
            type="text"
            name="company"
            autoComplete="off"
            tabIndex={-1}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex items-center justify-center min-h-12 px-6 rounded-lg bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-dark)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>

      <p
        role="status"
        aria-live="polite"
        className={`text-sm ${status === "error" ? "text-red-700" : "text-[var(--primary-dark)]"}`}
      >
        {message}
      </p>
    </form>
  );
}
