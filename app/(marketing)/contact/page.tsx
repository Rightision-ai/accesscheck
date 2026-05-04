import { Mail, MapPin } from "lucide-react";
import ContactForm from "@/app/components/marketing/ContactForm";

export const metadata = {
  title: "Contact",
  description:
    "Get in touch with the AccessCheck team — bring AccessCheck and the Rightision AI engine into your workflow.",
};

export default function ContactPage() {
  return (
    <section
      aria-labelledby="contact-heading"
      className="bg-[var(--bg-surface)]"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
            Contact
          </p>
          <h1
            id="contact-heading"
            className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)]"
          >
            Get in touch
          </h1>
          <p className="mt-5 text-lg text-[var(--text-main)] leading-relaxed">
            We’d love to hear from teams looking to bring AccessCheck — and
            the Rightision AI engine that powers it — into their workflow.
            Drop us a line and we’ll get back to you within a few working
            days.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex items-start gap-3 text-[var(--text-main)]">
              <Mail
                size={18}
                className="mt-0.5 text-[var(--primary-dark)] shrink-0"
                aria-hidden="true"
              />
              <a href="mailto:hello@accesscheck.uk" className="hover:underline">
                hello@accesscheck.uk
              </a>
            </li>
            <li className="flex items-start gap-3 text-[var(--text-main)]">
              <MapPin
                size={18}
                className="mt-0.5 text-[var(--primary-dark)] shrink-0"
                aria-hidden="true"
              />
              <span>Colony One, Silk Street, Manchester, M4 6LZ</span>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl bg-white border border-[var(--border)] p-6 md:p-8 shadow-sm">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
