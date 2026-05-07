import { BadgeCheck, Layers3, Timer, FileCheck2 } from "lucide-react";

type Stat = {
  icon: typeof BadgeCheck;
  value: string;
  label: string;
  sub: string;
  valueClass?: string;
};

const STATS: Stat[] = [
  {
    icon: BadgeCheck,
    value: "A–G ",
    label: "Accessibility categories",
    sub: "Clear accessibility categories to help teams understand which homes may suit different needs.",
  },
  {
    icon: Layers3,
    value: "Built on Standards",
    label: "Established standards",
    sub: "Informed by established access and housing design guidance, including wheelchair housing, Lifetime Homes and Part M.",
    valueClass:
      "mt-5 text-3xl md:text-3xl font-extrabold tracking-tight text-[var(--text-main)] leading-tight",
  },
  {
    icon: Timer,
    value: "Minutes",
    label: "From upload to report",
    sub: "Turn photos, plans and property data into a clear accessibility report.",
  },
  {
    icon: FileCheck2,
    value: "Allocation-ready",
    label: "Decision support",
    sub: "Designed to support better matching, clearer records and more informed decisions about adaptation potential.",
  },
];

const DEFAULT_VALUE_CLASS =
  "mt-5 text-3xl  font-extrabold tracking-tight text-[var(--text-main)] leading-none";

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
              </div>
              <p className={s.valueClass ?? DEFAULT_VALUE_CLASS}>{s.value}</p>
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
