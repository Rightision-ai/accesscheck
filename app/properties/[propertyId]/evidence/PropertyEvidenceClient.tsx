"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Skeleton, SkeletonCard } from "@/app/components/property-check/ui";
import PlanningDocs from "./PlanningDocs";

type Source = {
  id: string;
  source_type: string;
  source_name: string | null;
  source_url: string | null;
  source_date: string | null;
  confidence: number | null;
  raw_metadata_json?: Record<string, unknown> | null;
};
type Feature = {
  id: string;
  feature_name: string;
  feature_value: unknown;
  source_type: string | null;
  confidence: number | null;
  inferred: boolean;
  justification: string | null;
};
type Listing = {
  id: string;
  listing_type: string;
  event_date: string | null;
  price_gbp: number | null;
  status: string | null;
  source_name: string | null;
  source_url: string | null;
};
type QuestionMappingEntry = {
  question: string;
  answer: string;
  inferred: boolean;
  source?: string;
  confidence?: number;
  justification?: string;
  missing_evidence?: boolean;
  recommended_action?: string;
};
type MissingItem = {
  question: string;
  reason: string;
  recommended_action: string;
};

type EpcDetails = {
  dwelling_type: string | null;
  habitable_room_count: number | null;
  heated_room_count: number | null;
  extensions_count: number | null;
  floor_descriptions: string[];
  energy_rating_current: number | null;
  energy_rating_potential: number | null;
  potential_energy_band: string | null;
  main_heating: string | null;
};
type EpcMatch = {
  uprn: string | null;
  property_type: string | null;
  built_form: string | null;
  total_floor_area: string | null;
  construction_age_band: string | null;
  lodgement_date: string | null;
  local_authority: string | null;
  current_energy_rating: string | null;
  details: EpcDetails | null;
};

type Profile = {
  property: {
    id: string;
    address: string;
    postcode: string;
    postcode_normalised: string | null;
    uprn: string | null;
    local_authority: string | null;
    property_type: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  evidence_sources: Source[];
  features: Feature[];
  listings: Listing[];
  assessment_status: {
    evidence_status: string;
    assessment_readiness: string;
    overall_confidence: number | null;
    recommended_action: string | null;
    missing_evidence: MissingItem[];
    question_mapping: QuestionMappingEntry[];
  } | null;
  rental_provider_configured: boolean;
  street_view_image_url: string | null;
  map_image_url: string | null;
  google_maps_key: string | null;
};

const EPC_BAND_COLOR: Record<string, string> = {
  A: "bg-green-600",
  B: "bg-green-500",
  C: "bg-lime-500",
  D: "bg-yellow-500",
  E: "bg-amber-500",
  F: "bg-orange-500",
  G: "bg-red-600",
};

function EpcBadge({ band }: { band: string | null }) {
  if (!band) return null;
  const color = EPC_BAND_COLOR[band.toUpperCase()] ?? "bg-slate-500";
  return (
    <span
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2.5 text-lg font-extrabold text-white",
        color,
      )}
    >
      {band.toUpperCase()}
    </span>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function fmtGbp(n: number | null): string {
  return n == null ? "—" : `£${n.toLocaleString()}`;
}

/** Drop a leading "Q3 " / "Q12 — " style question-number prefix, keeping just the title. */
function stripQ(title: string): string {
  return title.replace(/^Q\d+\s*[—–-]?\s*/i, "");
}

export default function PropertyEvidenceClient({
  propertyId,
}: {
  propertyId: string;
}) {
  const [data, setData] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [findingPlans, setFindingPlans] = useState(false);
  const [planSearched, setPlanSearched] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/evidence-harvester/properties/${propertyId}/evidence`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      setError("Could not load evidence.");
      return;
    }
    setData(await res.json());
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function recompute() {
    setRecomputing(true);
    await fetch(
      `/api/evidence-harvester/properties/${propertyId}/preliminary-assessment`,
      { method: "POST" },
    );
    setTimeout(async () => {
      await load();
      setRecomputing(false);
    }, 5000);
  }

  async function findFloorplans() {
    setFindingPlans(true);
    await fetch(`/api/evidence-harvester/properties/${propertyId}/floorplans`, {
      method: "POST",
    }).catch(() => {});
    await load();
    setPlanSearched(true);
    setFindingPlans(false);
  }

  if (error)
    return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!data)
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          <div>
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-6 w-72 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    );

  const { property: p, assessment_status: st } = data;
  const epcSource = data.evidence_sources.find((s) => s.source_type === "epc");
  const epc = (epcSource?.raw_metadata_json ?? null) as EpcMatch | null;
  const svSource = data.evidence_sources.find(
    (s) => s.source_type === "google_street_view",
  );
  const planning = data.evidence_sources.filter(
    (s) => s.source_type === "planning_portal",
  );
  const sales = data.listings.filter((l) => l.listing_type === "sale");
  const rentals = data.listings.filter((l) => l.listing_type === "rent");

  const hasCoords = p.latitude != null && p.longitude != null;
  const loc = hasCoords ? `${p.latitude},${p.longitude}` : "";
  // External links open Google Maps directly — no Maps Embed API needed (unlike inline iframes).
  const panoLink = hasCoords
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${loc}`
    : null;
  const mapLink = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${loc}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link
              href="/property-check/survey-priority"
              className="text-xs font-semibold text-slate-500 hover:text-primary"
            >
              ← Property list
            </Link>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">
              {p.address}
            </h1>
            <p className="text-sm text-slate-500">{p.postcode}</p>
          </div>
          <button
            onClick={recompute}
            disabled={recomputing}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-primary disabled:opacity-60"
          >
            {recomputing ? "Recomputing…" : "Re-run check"}
          </button>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          This is a{" "}
          <span className="font-semibold">preliminary evidence check</span>, not
          a final accessibility or OT assessment.
        </div>

        {/* Status summary */}
        {st && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">
                Evidence status
              </div>
              <div className="text-lg font-extrabold text-slate-900 mt-1 capitalize">
                {st.evidence_status.replace(/_/g, " ")}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">
                Overall confidence
              </div>
              <div className="text-lg font-extrabold text-slate-900 mt-1">
                {st.overall_confidence != null
                  ? `${Math.round(st.overall_confidence * 100)}%`
                  : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">
                EPC rating
              </div>
              <div className="mt-1">
                <EpcBadge band={epc?.current_energy_rating ?? null} />
              </div>
            </div>
          </div>
        )}

        {/* Imagery: saved Street View screenshot + saved static map (with links to the live versions) */}
        {(data.street_view_image_url || data.map_image_url || hasCoords) && (
          <Section title="Location & imagery">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500">
                    Street View
                  </span>
                  {panoLink && (
                    <a
                      href={panoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-primary"
                    >
                      Open interactive ↗
                    </a>
                  )}
                </div>
                {data.street_view_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.street_view_image_url}
                    alt="Street View"
                    className="w-full h-56 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-full h-56 rounded-lg border border-dashed border-gray-300 grid place-items-center text-xs text-slate-400 text-center px-3">
                    No Street View imagery saved.
                    <br />
                    Enable image capture and re-run the check.
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500">
                    Map
                  </span>
                  {mapLink && (
                    <a
                      href={mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-primary"
                    >
                      Open in Google Maps ↗
                    </a>
                  )}
                </div>
                {data.map_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.map_image_url}
                    alt="Map"
                    className="w-full h-56 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-full h-56 rounded-lg border border-dashed border-gray-300 grid place-items-center text-xs text-slate-400">
                    No map saved
                  </div>
                )}
              </div>
            </div>
            {data.street_view_image_url && (
              <p className="text-[11px] text-slate-400 mt-2">
                Saved screenshots from Google. Use the links above for the live,
                interactive view.
              </p>
            )}
          </Section>
        )}

        <Section title="Property identity">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-sm">
            <Field label="UPRN" value={p.uprn} />
            <Field
              label="Postcode (normalised)"
              value={p.postcode_normalised}
            />
            <Field label="Local authority" value={p.local_authority} />
          </dl>
        </Section>

        <Section title="Property features">
          {data.features.length === 0 ? (
            <p className="text-sm text-slate-500">No features founded.</p>
          ) : (
            <ul className="text-sm flex flex-row justify-start flex-wrap  gap-y-1">
              {data.features.map((f) => (
                <li
                  key={f.id}
                  className="py-1.5 flex flex-row  border-primary px-2  border-r-2 items-center   last:border-r-0 "
                >
                  <span className="font-medium capitalize">
                    {f.feature_name.replace(/_/g, " ")}
                  </span>
                  : {String(f.feature_value)}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* EPC accessibility-relevant detail */}
        {epc && (
          <Section
            title="EPC & accessibility details"
            action={<EpcBadge band={epc.current_energy_rating} />}
          >
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-sm">
              <Field
                label="Dwelling type"
                value={epc.details?.dwelling_type ?? null}
              />
              <Field label="Property type" value={epc.property_type} />
              <Field label="Built form" value={epc.built_form} />
              <Field
                label="Total floor area"
                value={
                  epc.total_floor_area ? `${epc.total_floor_area} m²` : null
                }
              />
              <Field
                label="Habitable rooms"
                value={numOrNull(epc.details?.habitable_room_count)}
              />
              <Field
                label="Heated rooms"
                value={numOrNull(epc.details?.heated_room_count)}
              />
              <Field
                label="Extensions"
                value={numOrNull(epc.details?.extensions_count)}
              />
              <Field
                label="Construction age"
                value={epc.construction_age_band}
              />
              <Field
                label="Main heating"
                value={epc.details?.main_heating ?? null}
              />
              <Field
                label="Potential rating"
                value={
                  epc.details?.potential_energy_band
                    ? `Band ${epc.details.potential_energy_band}`
                    : null
                }
              />
              <Field label="EPC lodged" value={epc.lodgement_date} />
            </dl>
            {epc.details?.floor_descriptions &&
              epc.details.floor_descriptions.length > 0 && (
                <p className="text-xs text-slate-500 mt-3">
                  <span className="font-semibold text-slate-600">
                    Floor position:
                  </span>{" "}
                  {epc.details.floor_descriptions.join(", ")}
                </p>
              )}
            <p className="text-[11px] text-slate-400 mt-2">
              EPC certificates do not record lifts; floor position is inferred
              from the dwelling type and floor descriptions above.
            </p>
          </Section>
        )}

        {/* Planning floorplans — council planning portals (public records, all UK councils via PlanIt) */}
        <PlanningDocs
          sources={planning}
          onSearch={findFloorplans}
          searching={findingPlans}
          searched={planSearched}
        />

        {st && st.question_mapping.length > 0 && (
          <Section title="Accessibility Checking">
            <ul className="text-sm divide-y divide-gray-100">
              {st.question_mapping.map((q, i) => (
                <li key={i} className="py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-800">
                      {stripQ(q.question)}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        q.missing_evidence
                          ? "text-slate-400"
                          : "text-slate-700",
                      )}
                    >
                      {q.answer}
                      {q.confidence != null &&
                        !q.missing_evidence &&
                        ` · ${Math.round(q.confidence * 100)}%`}
                    </span>
                  </div>
                  {q.justification && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {q.justification}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {st && st.missing_evidence.length > 0 && (
          <Section title="Missing evidence">
            <ul className="text-sm space-y-2">
              {st.missing_evidence.map((m, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-500">•</span>
                  <span className="text-slate-700">
                    <span className="font-semibold">{stripQ(m.question)}</span> —{" "}
                    {m.recommended_action}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Listing history — last section */}
        <Section title="Listing history (sale & rent)">
          {sales.length === 0 && rentals.length === 0 ? (
            <p className="text-sm text-slate-500">
              No listing or transaction records found.
            </p>
          ) : (
            <div className="space-y-3">
              {sales.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-600 mb-1">
                    Sale history
                  </h3>
                  <ul className="text-sm divide-y divide-gray-100">
                    {sales.map((l) => (
                      <li
                        key={l.id}
                        className="py-1.5 flex items-center justify-between gap-3"
                      >
                        <span className="text-slate-700">
                          {l.event_date ?? "Unknown date"} ·{" "}
                          {fmtGbp(l.price_gbp)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {l.source_url ? (
                            <a
                              href={l.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary font-semibold"
                            >
                              {l.source_name ?? "Source"} ↗
                            </a>
                          ) : (
                            (l.source_name ?? "—")
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rentals.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-600 mb-1">
                    Rental history
                  </h3>
                  <ul className="text-sm divide-y divide-gray-100">
                    {rentals.map((l) => (
                      <li
                        key={l.id}
                        className="py-1.5 flex items-center justify-between gap-3"
                      >
                        <span className="text-slate-700">
                          {l.event_date ?? "Listed"} · {fmtGbp(l.price_gbp)} ·{" "}
                          {l.status ?? ""}
                        </span>
                        <span className="text-xs text-slate-400">
                          {l.source_url ? (
                            <a
                              href={l.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary font-semibold"
                            >
                              {l.source_name ?? "Source"} ↗
                            </a>
                          ) : (
                            (l.source_name ?? "—")
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {!data.rental_provider_configured && (
            <p className="text-[11px] text-slate-400 mt-2">
              Rental listing history is unavailable — no rental data provider is
              configured. Sale history is sourced from HM Land Registry.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  // Defensive: EPC fields occasionally arrive as { value, language } objects — never render an object.
  let text: string | null = null;
  if (value != null) {
    if (typeof value === "object") {
      const v = (value as { value?: unknown }).value;
      text = v != null ? String(v) : null;
    } else {
      text = String(value);
    }
  }
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-800 font-medium">{text ?? "—"}</dd>
    </div>
  );
}

function numOrNull(n: number | null | undefined): string | null {
  return n == null ? null : String(n);
}
