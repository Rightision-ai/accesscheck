import Link from "next/link";
import { ArrowRight, Stethoscope, HeartHandshake, Check } from "lucide-react";

const CARDS = [
  {
    icon: Stethoscope,
    eyebrow: "For occupational therapists & local authorities",
    title: "Faster home visits, defensible evidence.",
    bullets: [
      "Cut prep and write-up time on every assessment",
      "Photo-grounded evidence behind every grade",
      "DFG-ready PDFs your panel can trust",
      "Costed adaptation plans aligned to budget thresholds",
    ],
    cta: { label: "Login to start", href: "/login" },
    accent: "primary",
  },
  {
    icon: HeartHandshake,
    eyebrow: "For home improvement agencies & charities",
    title: "Scale assessments. Support more applicants.",
    bullets: [
      "Assess at portfolio scale from existing photos",
      "Help applicants prepare DFG submissions",
      "White-label option for partner workflows",
      "Impact reporting for funders and trustees",
    ],
    cta: { label: "Talk to us", href: "/about" },
    accent: "neutral",
  },
] as const;

export default function AudienceCards() {
  return (
    <section aria-labelledby="audience-heading" className="bg-[var(--bg-surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2
            id="audience-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-main)] leading-[1.05]"
          >
            Built for the teams making housing accessible.
          </h2>
          <p className="mt-4 text-lg text-[var(--text-dim)]">
            Whether you assess homes one at a time or thousands at a time,
            AccessCheck adapts to how you work.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {CARDS.map(({ icon: Icon, ...c }) => (
            <article
              key={c.title}
              className={`rounded-2xl bg-white p-8 border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${c.accent === "primary" ? "border-[var(--primary)]" : "border-[var(--border)]"}`}
            >
              <span
                className="inline-grid place-items-center w-12 h-12 rounded-lg bg-[var(--primary-light)] text-[var(--primary-dark)]"
                aria-hidden="true"
              >
                <Icon size={22} />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">
                {c.eyebrow}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-[var(--text-main)]">
                {c.title}
              </h3>
              <ul className="mt-5 space-y-2.5">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[var(--text-main)]">
                    <Check size={18} className="mt-0.5 text-[var(--primary-dark)] shrink-0" aria-hidden="true" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={c.cta.href}
                className="mt-7 inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-lg bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
              >
                {c.cta.label}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
