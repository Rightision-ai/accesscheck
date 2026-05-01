import Link from "next/link";
import { ArrowRight, Camera, Ruler, Wrench, FileText, BadgeCheck } from "lucide-react";
import SolutionsNav from "@/app/components/marketing/SolutionsNav";

export const metadata = {
  title: "Solutions",
  description:
    "Explore the AccessCheck solutions: floor plan and image analysis, costed adaptation plans, DFG-ready reports.",
};

const SOLUTIONS = [
  {
    icon: Ruler,
    href: "/solutions/floor-plan-analysis",
    title: "Floor plan analysis",
    body: "Doorway widths, turning circles and level access measured directly from drawings.",
  },
  {
    icon: Camera,
    href: "/solutions/image-analysis",
    title: "Image analysis",
    body: "Computer vision detects fixtures, hazards and assistive features from photos.",
  },
  {
    icon: Wrench,
    href: "/solutions/adaptation-plans",
    title: "Adaptation plans",
    body: "Costed, budget-aware adaptation recommendations grounded in standards.",
  },
  {
    icon: FileText,
    href: "/solutions/reports",
    title: "DFG-ready reports",
    body: "Defensible PDFs with linked photo evidence, ready for grant panels.",
  },
  {
    icon: BadgeCheck,
    href: "/solutions/dfg",
    title: "Disabled Facilities Grant",
    body: "Help applicants and OTs prepare faster, better-evidenced DFG submissions.",
  },
];

export default function SolutionsOverviewPage() {
  return (
    <>
      <SolutionsNav />
      <section className="bg-white border-b border-[var(--border)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
            Solutions
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)]">
            One platform. Five ways AccessCheck helps.
          </h1>
          <p className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed">
            From the first photo to a grant-ready report, each capability
            below is built around the same goal: a defensible accessibility
            grade for every home.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SOLUTIONS.map(({ icon: Icon, ...s }) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="group h-full block rounded-xl border border-[var(--border)] bg-white p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
                >
                  <span className="inline-grid place-items-center w-12 h-12 rounded-lg bg-[var(--primary-light)] text-[var(--primary-dark)]" aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <h2 className="mt-4 text-lg font-bold text-[var(--text-main)]">
                    {s.title}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-dim)] leading-relaxed">
                    {s.body}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary-dark)]">
                    Learn more
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
