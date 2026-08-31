"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import ImageUploadField from "@/app/components/settings/ImageUploadField";
import { EMAIL_ERROR, PHONE_ERROR, PHONE_PLACEHOLDER, isValidEmail, isValidPhone, sanitisePhoneInput } from "@/lib/utils/phone";

type Organisation = Record<string, string | null>;

const fields = [
  ["name", "Organisation name", "Rightision Council"],
  ["contact_name", "Primary contact", "Jane Doe"],
  ["contact_email", "Contact email", "info@council.gov.uk"],
  ["contact_phone", "Contact phone", PHONE_PLACEHOLDER],
  ["address_line_1", "Address line 1", "12 High Street"],
  ["address_line_2", "Address line 2", "Floor 3"],
  ["city", "Town or city", "London"],
  ["region", "Region", "Greater London"],
  ["postcode", "Postcode", "SW1A 1AA"],
] as const;

export default function OrganisationForm({ initial, organisationId }: { initial: Organisation; organisationId: string }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);

  const emailError = isValidEmail(data.contact_email) ? "" : EMAIL_ERROR;
  const phoneError = isValidPhone(data.contact_phone) ? "" : PHONE_ERROR;
  const nameError = (data.name ?? "").trim() ? "" : "Organisation name is required.";
  const invalid = Boolean(emailError || phoneError || nameError);
  const errorFor = (key: string) => (key === "contact_email" ? emailError : key === "contact_phone" ? phoneError : key === "name" ? nameError : "");

  const set = (key: string, value: string) => setData((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    const response = await fetch("/api/organisations/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) return toast.error(body.error);
    toast.success("Organisation updated");
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold">Organisation</h2>
      <p className="text-sm text-slate-500">Council identity used across reports and adaptation plan PDFs.</p>
      <div className="mt-6">
        <ImageUploadField
          label="Logo"
          value={data.logo_url || null}
          onChange={(url) => set("logo_url", url ?? "")}
          pathPrefix={`organisations/${organisationId}`}
          shape="square"
          hint="JPEG, PNG, WebP or SVG, up to 5 MB."
        />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label, placeholder]) => {
          const error = errorFor(key);
          return (
            <label key={key} className="text-xs font-bold text-slate-600">
              {label}
              <input
                value={data[key] ?? ""}
                onChange={(e) => set(key, key === "contact_phone" ? sanitisePhoneInput(e.target.value) : e.target.value)}
                placeholder={placeholder}
                type={key === "contact_email" ? "email" : key === "contact_phone" ? "tel" : "text"}
                inputMode={key === "contact_phone" ? "tel" : undefined}
                aria-invalid={error ? true : undefined}
                className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-normal placeholder:text-slate-400 ${error ? "border-red-400" : "border-slate-200"}`}
              />
              {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
            </label>
          );
        })}
      </div>
      <button
        onClick={save}
        disabled={saving || invalid}
        className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save organisation"}
      </button>
    </section>
  );
}
