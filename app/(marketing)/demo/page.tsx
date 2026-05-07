import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ArcadeEmbed from "@/app/components/marketing/ArcadeEmbed";

export const metadata = {
  title: "Interactive demo",
  description:
    "Take a hands-on tour of AccessCheck — see how photos, plans and property data become a clear accessibility category and property-level report.",
};

export default function DemoPage() {
  return (
    <>
      <section>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center py-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
            Interactive demo
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)]">
            See AccessCheck in action
          </h1>
          <p className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed">
            Walk through a real assessment in minutes. No sign-up required —
            click through the demo to see how AccessCheck turns photos, plans
            and property data into a clear accessibility category and a
            property-level report.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <ArcadeEmbed />
        </div>
      </section>

      <section className="bg-[var(--bg-surface)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)]">
            Want to see it on your own properties?
          </h2>
          <p className="mt-3 text-[var(--text-dim)]">
            We'll walk you through a tailored assessment for your team.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-lg bg-[var(--primary)] text-white text-base font-semibold shadow-sm hover:bg-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
            >
              Talk to us
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
