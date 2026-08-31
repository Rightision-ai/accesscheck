"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import ImageUploadField from "@/app/components/settings/ImageUploadField";
import { PHONE_ERROR, PHONE_PLACEHOLDER, isValidPhone, sanitisePhoneInput } from "@/lib/utils/phone";

type Profile = {
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
};

export default function ProfileForm({ initial, email, userId }: { initial: Profile; email: string; userId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState({
    firstName: initial.first_name ?? "",
    lastName: initial.last_name ?? "",
    jobTitle: initial.job_title ?? "",
    phone: initial.phone ?? "",
    avatarUrl: initial.avatar_url ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof profile>(key: K, value: string) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const firstNameError = profile.firstName.trim() ? "" : "First name is required.";
  const lastNameError = profile.lastName.trim() ? "" : "Last name is required.";
  const phoneError = isValidPhone(profile.phone) ? "" : PHONE_ERROR;
  const invalid = Boolean(firstNameError || lastNameError || phoneError);

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) return toast.error(body.error);
    toast.success("Profile updated");
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold">Profile</h2>
      <p className="text-sm text-slate-500">Information shown to other users in your organisation.</p>
      <div className="mt-6">
        <ImageUploadField
          label="Profile photo"
          value={profile.avatarUrl || null}
          onChange={(url) => set("avatarUrl", url ?? "")}
          pathPrefix={`avatars/${userId}`}
          shape="circle"
          hint="JPEG, PNG, WebP or SVG, up to 5 MB."
        />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          value={profile.firstName}
          onChange={(value) => set("firstName", value)}
          placeholder="Jane"
          autoComplete="given-name"
          error={firstNameError}
        />
        <Field
          label="Last name"
          value={profile.lastName}
          onChange={(value) => set("lastName", value)}
          placeholder="Doe"
          autoComplete="family-name"
          error={lastNameError}
        />
        <Field label="Email" value={email} disabled />
        <Field
          label="Job title"
          value={profile.jobTitle}
          onChange={(value) => set("jobTitle", value)}
          placeholder="Occupational Therapist"
          autoComplete="organization-title"
        />
        <Field
          label="Phone"
          value={profile.phone}
          onChange={(value) => set("phone", sanitisePhoneInput(value))}
          placeholder={PHONE_PLACEHOLDER}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={phoneError}
        />
      </div>
      <button
        onClick={save}
        disabled={saving || invalid}
        className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  error,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  inputMode?: "tel" | "email" | "text";
  autoComplete?: string;
  error?: string;
}) {
  return (
    <label className="text-xs font-bold text-slate-600">
      {label}
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-normal placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 ${error ? "border-red-400" : "border-slate-200"}`}
      />
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}
