"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const MIN_PASSWORD_LENGTH = 8;

type Invitation = { email: string; organisationName: string; expiresAt: string };

/**
 * The accept page an invited person lands on straight from their email.
 *
 * They usually have no AccessCheck account, so this collects a name and a
 * password and the accept endpoint creates the account for them. Someone who
 * already has an account enters their existing password in the same field.
 */
export default function InviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/organisations/invitations/lookup?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const body = await response.json();
        if (cancelled) return;
        if (!response.ok) return setLookupError(body.error ?? "This invitation could not be opened.");
        setInvitation(body as Invitation);
      })
      .catch(() => {
        if (!cancelled) setLookupError("This invitation could not be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const passwordError =
    form.password.length > 0 && form.password.length < MIN_PASSWORD_LENGTH
      ? `At least ${MIN_PASSWORD_LENGTH} characters.`
      : "";
  const confirmError =
    form.confirm.length > 0 && form.confirm !== form.password ? "Passwords do not match." : "";
  const incomplete =
    !form.firstName.trim() ||
    !form.lastName.trim() ||
    form.password.length < MIN_PASSWORD_LENGTH ||
    form.confirm !== form.password;

  const accept = async (event: React.FormEvent) => {
    event.preventDefault();
    if (incomplete) return;
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/organisations/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      }),
    });
    const body = await response.json();
    setSubmitting(false);
    if (!response.ok) return setError(body.error ?? "Could not accept the invitation.");
    router.push("/dashboard");
    router.refresh();
  };

  if (lookupError) {
    return (
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset, no loader config */}
        <img src="/assets/logo/PNG/AcessCheck -21.png" alt="AccessCheck" className="mx-auto h-14" />
        <h1 className="mt-5 text-2xl font-extrabold text-slate-950">Invitation unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{lookupError}</p>
      </section>
    );
  }

  if (!invitation) {
    return (
      <section className="flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500">
        <Loader2 size={18} className="animate-spin text-primary" /> Opening your invitation…
      </section>
    );
  }

  return (
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset, no loader config */}
        <img src="/assets/logo/PNG/AcessCheck -21.png" alt="AccessCheck" className="mx-auto h-14" />
        <h1 className="mt-5 text-2xl font-extrabold text-slate-950">Join {invitation.organisationName}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Set up your account for <span className="font-semibold text-slate-700">{invitation.email}</span>.
          If you already have an AccessCheck account, enter its password instead.
        </p>
      </div>

      <form onSubmit={accept} className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="First name" value={form.firstName} onChange={(v) => set("firstName", v)} placeholder="Jane" autoComplete="given-name" />
        <Field label="Last name" value={form.lastName} onChange={(v) => set("lastName", v)} placeholder="Doe" autoComplete="family-name" />
        <div className="sm:col-span-2">
          <Field label="Password" type="password" value={form.password} onChange={(v) => set("password", v)} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} autoComplete="new-password" error={passwordError} />
        </div>
        <div className="sm:col-span-2">
          <Field label="Confirm password" type="password" value={form.confirm} onChange={(v) => set("confirm", v)} placeholder="Re-enter your password" autoComplete="new-password" error={confirmError} />
        </div>

        {error && (
          <p className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || incomplete}
          className="sm:col-span-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Setting up your account…" : "Accept invitation"}
        </button>
      </form>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <label className="text-xs font-bold text-slate-600">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-normal placeholder:text-slate-400 ${error ? "border-red-400" : "border-slate-200"}`}
      />
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}
