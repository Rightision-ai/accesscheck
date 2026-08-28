"use client";

import { useState } from "react";
import { toast } from "sonner";

type Profile = { display_name?: string | null; job_title?: string | null; phone?: string | null; avatar_url?: string | null };
export default function ProfileForm({ initial, email }: { initial: Profile; email: string }) {
  const [profile, setProfile] = useState({ displayName: initial.display_name ?? "", jobTitle: initial.job_title ?? "", phone: initial.phone ?? "", avatarUrl: initial.avatar_url ?? "" }); const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) }); const body = await response.json(); setSaving(false); if (!response.ok) return toast.error(body.error); toast.success("Profile updated"); };
  return <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Profile</h2><p className="text-sm text-slate-500">Information shown to other users in your organisation.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Name" value={profile.displayName} onChange={(value) => setProfile((p) => ({ ...p, displayName: value }))} /><Field label="Email" value={email} disabled /><Field label="Job title" value={profile.jobTitle} onChange={(value) => setProfile((p) => ({ ...p, jobTitle: value }))} /><Field label="Phone" value={profile.phone} onChange={(value) => setProfile((p) => ({ ...p, phone: value }))} /><div className="sm:col-span-2"><Field label="Profile image URL" value={profile.avatarUrl} onChange={(value) => setProfile((p) => ({ ...p, avatarUrl: value }))} /></div></div><button onClick={save} disabled={saving} className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button></section>;
}
function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange?: (value: string) => void; disabled?: boolean }) { return <label className="text-xs font-bold text-slate-600">{label}<input value={value} onChange={(e) => onChange?.(e.target.value)} disabled={disabled} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal disabled:bg-slate-50 disabled:text-slate-500" /></label>; }
