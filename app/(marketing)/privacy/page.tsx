export const metadata = {
  title: "Privacy policy",
  description:
    "How AccessCheck — a service by Foundations, powered by the Rightision AI engine — collects, uses and protects personal data.",
};

export default function PrivacyPage() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
          Legal
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)]">
          Privacy policy
        </h1>
        <p className="mt-3 text-sm text-[var(--text-dim)]">
          Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" })}
        </p>

        <div className="mt-10 space-y-8 text-[var(--text-main)] leading-relaxed">
          <article>
            <h2 className="text-2xl font-bold">Who we are</h2>
            <p className="mt-3">
              AccessCheck is a service operated by Foundations, the national
              body for home improvement agencies in England, and powered by
              the Rightision AI engine. References to “we”, “us” or “our” mean
              AccessCheck operating under Foundations.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">What we collect</h2>
            <p className="mt-3">
              When you use AccessCheck we may process: account details (name,
              email, organisation), property data you upload (photos, floor
              plans, listing text), assessment outputs generated from that
              data, and routine technical information (IP address, device
              information, log data) needed to operate the service.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">How we use it</h2>
            <p className="mt-3">
              We use the information you provide to deliver assessments,
              generate reports, support your account, improve the service, and
              meet legal and regulatory obligations. Property data is processed
              to produce the AccessCheck accessibility category and supporting
              evidence — not to train third-party models without your consent.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">Lawful basis</h2>
            <p className="mt-3">
              We rely on contract, legitimate interests and, where relevant,
              consent. Where data is processed on behalf of a public body
              (such as a local authority), we act as a data processor under
              the relevant agreement.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">Sharing</h2>
            <p className="mt-3">
              We do not sell personal data. We share information with vetted
              processors (hosting, AI inference, email delivery) under written
              agreements, and with public authorities where legally required.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">Retention</h2>
            <p className="mt-3">
              We retain assessment data for as long as your organisation needs
              it to operate the service and meet record-keeping requirements,
              and we delete or anonymise data that is no longer needed.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">Your rights</h2>
            <p className="mt-3">
              You have rights of access, rectification, erasure, restriction,
              portability and objection under UK GDPR. To exercise them, email
              {" "}
              <a className="underline" href="mailto:hello@accesscheck.uk">
                hello@accesscheck.uk
              </a>
              .
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">Contact</h2>
            <p className="mt-3">
              Questions about this policy can be sent to
              {" "}
              <a className="underline" href="mailto:hello@accesscheck.uk">
                hello@accesscheck.uk
              </a>
              {" "}
              or by post to Colony One, Silk Street, Manchester, M4 6LZ.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
