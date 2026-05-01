import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import SolutionsNav from "./SolutionsNav";

interface SolutionPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  highlights: string[];
  body: { heading: string; text: string }[];
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

export default function SolutionPage({
  eyebrow,
  title,
  intro,
  highlights,
  body,
  primaryCta = { label: "Login to start", href: "/login" },
  secondaryCta = { label: "Talk to us", href: "/about" },
}: SolutionPageProps) {
  return (
    <>
      <SolutionsNav />
      <section className="bg-white border-b border-[var(--border)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)]">
            {title}
          </h1>
          <p className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed">
            {intro}
          </p>
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {highlights.map((h) => (
              <li
                key={h}
                className="flex items-start gap-2 text-[var(--text-main)] bg-white border border-[var(--border)] rounded-lg p-3"
              >
                <Check
                  size={18}
                  className="mt-0.5 text-[var(--primary-dark)] shrink-0"
                  aria-hidden="true"
                />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 gap-10">
          {body.map((b) => (
            <article key={b.heading}>
              <h2 className="text-2xl font-bold text-[var(--text-main)]">
                {b.heading}
              </h2>
              <p className="mt-3 text-[var(--text-main)] leading-relaxed">
                {b.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[var(--bg-surface)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)]">
            Ready to try it on your next assessment?
          </h2>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={primaryCta.href}
              className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-lg bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
            >
              {primaryCta.label}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              href={secondaryCta.href}
              className="inline-flex items-center justify-center min-h-12 px-6 rounded-lg border border-[var(--text-main)]/15 text-[var(--text-main)] font-semibold hover:border-[var(--primary-dark)] hover:text-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
            >
              {secondaryCta.label}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
