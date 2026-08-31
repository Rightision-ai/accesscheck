"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download } from "lucide-react";
import type { RateCardVersionSummary } from "@/lib/rate-cards/repository";

export default function RateCardVersions({
  versions,
  canManage,
}: {
  versions: RateCardVersionSummary[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function activate(version: RateCardVersionSummary) {
    setBusyId(version.id);
    try {
      const response = await fetch(`/api/rate-cards/versions/${version.id}/activate`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "That version could not be activated.");
        return;
      }
      toast.success(`Version ${body.version} is now in use.`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (versions.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">Version history</h2>
        <p className="mt-1 text-sm text-slate-500">
          You have not published a schedule of rates yet. Plans are priced from the national
          indicative card, which every organisation starts on.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-slate-900">Version history</h2>
      <p className="mt-1 text-sm text-slate-500">
        Every upload becomes a version. A plan keeps the prices of the version that produced it,
        so an issued plan never re-prices on its own.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-3">Version</th>
              <th className="py-2 pr-3">In force</th>
              <th className="py-2 pr-3">Priced items</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((version) => (
              <tr key={version.id} className="border-b border-slate-100 align-top">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      v{version.version} · {version.label}
                    </span>
                    {version.isActive && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        In use
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Published {new Date(version.createdAt).toLocaleDateString("en-GB")}
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-slate-600">
                  {version.effectiveFrom} – {version.effectiveTo ?? "present"}
                </td>
                <td className="py-2.5 pr-3 text-slate-600">{version.itemCount}</td>
                <td className="py-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    {version.sourceFilename && (
                      <a
                        href={`/api/rate-cards/export?version=${version.version}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 no-underline hover:text-primary-dark"
                        title={version.sourceFilename}
                      >
                        <Download size={12} />
                        Original CSV
                      </a>
                    )}
                    {canManage && !version.isActive && (
                      <button
                        type="button"
                        onClick={() => activate(version)}
                        disabled={busyId !== null}
                        className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:border-green-300 hover:bg-green-50 disabled:opacity-50"
                      >
                        {busyId === version.id ? "Activating…" : "Activate"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
