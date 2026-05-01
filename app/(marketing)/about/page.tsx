import { Mail, MapPin } from "lucide-react";
import ContactForm from "@/app/components/marketing/ContactForm";

export const metadata = {
  title: "About & contact",
  description:
    "About AccessCheck — a service by Foundations — and how to get in touch.",
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-white border-b border-[var(--border)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
            About
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)]">
            A service by Foundations, for the people making housing accessible.
          </h1>
          <p className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed">
            AccessCheck is built by Foundations — the national body for home
            improvement agencies in England — to help OTs, local authorities
            and charities assess homes faster, more consistently, and with
            evidence that holds up to review.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 gap-10">
          <article>
            <h2 className="text-2xl font-bold text-[var(--text-main)]">
              Who AccessCheck is for
            </h2>
            <p className="mt-3 text-[var(--text-main)] leading-relaxed">
              Occupational therapists, local authority housing teams, home
              improvement agencies, charities supporting disabled applicants,
              and the applicants themselves. Wherever an accessibility
              decision is being made about a home, AccessCheck aims to make
              that decision faster, fairer and more evidenced.
            </p>
          </article>
          <article>
            <h2 className="text-2xl font-bold text-[var(--text-main)]">
              How we approach accessibility
            </h2>
            <p className="mt-3 text-[var(--text-main)] leading-relaxed">
              Our grading is grounded in recognised standards — the
              Wheelchair Housing Design Guide, Housing Corporation Scheme
              Development Standards, Lifetime Homes and Building Regulations
              Part M. Every grade is supported by photographic, geometric or
              listing evidence so reviewers can see exactly how it was
              reached.
            </p>
          </article>
        </div>
      </section>

      <section aria-labelledby="contact-heading" className="bg-[var(--bg-surface)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2
              id="contact-heading"
              className="text-3xl font-extrabold tracking-tight text-[var(--text-main)]"
            >
              Get in touch
            </h2>
            <p className="mt-3 text-[var(--text-main)] leading-relaxed">
              We’d love to hear from teams looking to bring AccessCheck into
              their workflow. Drop us a line and we’ll get back to you within
              a few working days.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex items-start gap-3 text-[var(--text-main)]">
                <Mail size={18} className="mt-0.5 text-[var(--primary-dark)] shrink-0" aria-hidden="true" />
                <a
                  href="mailto:hello@accesscheck.uk"
                  className="hover:underline"
                >
                  hello@accesscheck.uk
                </a>
              </li>
              <li className="flex items-start gap-3 text-[var(--text-main)]">
                <MapPin size={18} className="mt-0.5 text-[var(--primary-dark)] shrink-0" aria-hidden="true" />
                <span>
                  Colony One, Silk Street, Manchester, M4 6LZ
                </span>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-white border border-[var(--border)] p-6 md:p-8 shadow-sm">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
