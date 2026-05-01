import Link from "next/link";
import Image from "next/image";

const STEPS = [
  {
    number: "01",
    title: "Visual Intelligence",
    description:
      "Computer vision analyses room geometry and features from existing floor plans or photos.",
    image: "/assets/media/visual-inteligence.png",
    href: "/solutions/image-analysis",
  },
  {
    number: "02",
    title: "Geometric Analysis",
    description:
      "Doorway widths, turning circles and level access measured directly from drawings.",
    image: "/assets/media/geometry-analysis.png",
    href: "/solutions/floor-plan-analysis",
  },
  {
    number: "03",
    title: "Natural Language Processing",
    description:
      "Listing text is parsed and cross-checked against the photos so contradictions surface early.",
    image: "/assets/media/nlp.png",
    href: "/solutions/reports",
  },
  {
    number: "04",
    title: "Geospatial Analysis",
    description:
      "Approach gradients, kerbs and local context inform whether a home is reachable, not just usable.",
    image: "/assets/media/geospatial-analysis.png",
    href: "/solutions",
  },
];

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <span className="inline-block text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
            How it works
          </span>
          <h2
            id="how-heading"
            className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-main)] leading-[1.05]"
          >
            The 4-step AI engine.
          </h2>
          <p className="mt-4 text-lg text-[var(--text-dim)] leading-relaxed">
            How AccessCheck analyses a home — from pixels and plans to a
            defensible accessibility grade.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <li key={s.number} className="ac-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <Link
                href={s.href}
                className="engine-card group h-full block rounded-2xl border border-[var(--border)] bg-white overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
              >
                <div className="card-image-wrapper relative aspect-[4/3] overflow-hidden bg-[var(--bg-surface)]">
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
                    className="card-image object-cover"
                  />
                </div>
                <div className="p-6">
                  <span className="inline-block text-xs font-extrabold tracking-[0.2em] text-[var(--primary-dark)]">
                    {s.number}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-[var(--text-main)] group-hover:text-[var(--primary-dark)] transition-colors">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--text-dim)] leading-relaxed">
                    {s.description}
                  </p>
                </div>
                <span className="card-glow" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
