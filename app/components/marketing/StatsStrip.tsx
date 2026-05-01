import { BadgeCheck, Layers3, Timer, FileCheck2 } from "lucide-react";

const STATS = [
  {
    icon: BadgeCheck,
    value: "A–G",
    label: "Accessibility grades",
    sub: "One letter, from A (fully wheelchair-accessible) to G (not yet assessed).",
  },
  {
    icon: Layers3,
    value: "4",
    label: "Recognised standards",
    sub: "WHDG · Housing Corp SDS · Lifetime Homes · Part M.",
  },
  {
    icon: Timer,
    value: "Minutes",
    label: "From upload to report",
    sub: "Photos and plans become a defensible PDF in minutes, not weeks.",
  },
  {
    icon: FileCheck2,
    value: "DFG",
    label: "Application-ready",
    sub: "Built to drop straight into Disabled Facilities Grant submissions.",
  },
];

export default function StatsStrip() {
  return (
    <section
      aria-labelledby="stats-heading"
      className="bg-[var(--bg-surface)] border-y border-[var(--border)]"
    >
      <h2 id="stats-heading" className="sr-only">
        AccessCheck at a glance
      </h2>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)] rounded-2xl overflow-hidden border border-[var(--border)]">
          {STATS.map(({ icon: Icon, ...s }, i) => (
            <li
              key={s.label}
              className="ac-fade-up bg-white p-6 md:p-8 transition-colors hover:bg-[var(--primary-light)]/40"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className="inline-grid place-items-center w-11 h-11 rounded-lg bg-[var(--primary-light)] text-[var(--primary-dark)]"
                  aria-hidden="true"
                >
                  <Icon size={22} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-dim)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-5 text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-main)] leading-none">
                {s.value}
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--primary-dark)] uppercase tracking-wide">
                {s.label}
              </p>
              <p className="mt-2 text-sm text-[var(--text-dim)] leading-relaxed">
                {s.sub}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
