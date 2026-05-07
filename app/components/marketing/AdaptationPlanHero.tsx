import { ArrowRight, ArrowUp, PoundSterling } from "lucide-react";

const BANDS = ["A", "B", "C", "D", "E", "E+", "F"] as const;

function BandPathway({ active }: { active: (typeof BANDS)[number] }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--border)] bg-white px-2 py-1">
      {BANDS.map((b) => {
        const isActive = b === active;
        return (
          <span
            key={b}
            className={`grid place-items-center min-w-7 h-7 rounded-full text-[11px] font-bold ${
              isActive
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--text-dim)]"
            }`}
          >
            {b}
          </span>
        );
      })}
    </div>
  );
}

export default function AdaptationPlanHero() {
  return (
    <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xl overflow-hidden">
      {/* Header card */}
      <div className="bg-white p-5 border-b border-[var(--border)]">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--primary-dark)]">
          <PoundSterling size={14} aria-hidden="true" />
          Adaptation plan example
        </p>
        <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[var(--text-main)]">
          £20,000 plan
        </h3>
        <p className="mt-2 text-sm text-[var(--text-dim)] leading-relaxed">
          Bundling 4 adaptations under a £20,000 budget, the property&rsquo;s
          accessibility category is projected to move from D to C.
        </p>

        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] text-center mb-2">
            Category pathway
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <BandPathway active="D" />
            <ArrowRight
              size={16}
              className="text-[var(--text-dim)] shrink-0"
              aria-hidden="true"
            />
            <BandPathway active="C" />
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-[var(--bg-surface)]">
        <div className="rounded-lg border border-[var(--border)] bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            Total cost
          </p>
          <p className="mt-1 text-lg font-extrabold text-[var(--text-main)]">
            £19,800
          </p>
          <p className="text-[10px] text-[var(--text-dim)]">
            within £20,000 cap
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            Disruption
          </p>
          <p className="mt-1 text-lg font-extrabold text-[var(--text-main)]">
            Major
          </p>
          <p className="text-[10px] text-[var(--text-dim)]">consider decant</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            Projected category
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="grid place-items-center w-7 h-7 rounded-full bg-[var(--primary)] text-white text-xs font-bold">
              C
            </span>
            <span className="inline-flex items-center text-[11px] font-semibold text-[var(--primary-dark)]">
              <ArrowUp size={12} aria-hidden="true" />
              from D
            </span>
          </div>
        </div>
      </div>

      {/* Recommended adaptation card */}
      <div className="px-3 pb-4 bg-[var(--bg-surface)]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-1.5 px-1">
          Recommended adaptations
        </p>
        <article className="rounded-lg bg-white border border-[var(--border)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                Adaptation 1
              </p>
              <h4 className="mt-1 text-sm font-bold text-[var(--text-main)]">
                Install accessible ground-floor WC
              </h4>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-extrabold text-[var(--text-main)]">
                £9,000
              </p>
              <p className="text-[10px] text-[var(--text-dim)]">
                Major Disruption
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-dim)] leading-relaxed line-clamp-3">
            Substantive build delivered by plumbing, building, carpentry and
            electrics. Removes accessibility barriers around toilet access on
            the entry level and provides 100 cm lateral transfer space for
            independent use.
          </p>
        </article>
      </div>
    </div>
  );
}
