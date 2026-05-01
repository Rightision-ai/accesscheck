import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section aria-labelledby="final-cta-heading" className="bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2
          id="final-cta-heading"
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-main)] leading-[1.05]"
        >
          Ready to make housing more accessible?
        </h2>
        <p className="mt-4 text-lg text-[var(--text-dim)]">
          Sign in to start your first assessment.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-lg bg-[var(--primary)] text-white text-base font-semibold shadow-sm hover:bg-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
          >
            Login
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center justify-center min-h-12 px-7 rounded-lg border border-[var(--text-main)]/15 text-[var(--text-main)] text-base font-semibold hover:border-[var(--primary-dark)] hover:text-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
          >
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
