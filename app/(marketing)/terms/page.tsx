export const metadata = {
  title: "Terms and conditions",
  description:
    "Terms governing use of AccessCheck — a service by Foundations, powered by the Rightision AI engine.",
};

export default function TermsPage() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
          Legal
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)]">
          Terms and conditions
        </h1>
        <p className="mt-3 text-sm text-[var(--text-dim)]">
          Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" })}
        </p>

        <div className="mt-10 space-y-8 text-[var(--text-main)] leading-relaxed">
          <article>
            <h2 className="text-2xl font-bold">1. About these terms</h2>
            <p className="mt-3">
              These terms govern your access to and use of AccessCheck, a
              service operated by Foundations and powered by the Rightision
              AI engine. By using AccessCheck you agree to these terms.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">2. Accounts</h2>
            <p className="mt-3">
              You must keep your login credentials secure and you are
              responsible for activity carried out through your account. Tell
              us promptly if you believe an account has been compromised.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">3. Acceptable use</h2>
            <p className="mt-3">
              You may use AccessCheck for lawful, professional accessibility
              assessment purposes. You must not upload data you do not have
              permission to process, attempt to reverse-engineer the service,
              or use it to make automated decisions that materially affect
              individuals without appropriate human oversight.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">4. The assessment output</h2>
            <p className="mt-3">
              AccessCheck produces evidence-backed accessibility grades and
              recommendations to support professional judgement. The service
              does not replace clinical, surveying or planning expertise.
              Reports should be reviewed by qualified personnel before they
              are used for funding, procurement or compliance decisions.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">5. Your data</h2>
            <p className="mt-3">
              You retain rights in the data you upload. You grant us the
              limited rights needed to process that data to provide the
              service. See our
              {" "}
              <a className="underline" href="/privacy">privacy policy</a>
              {" "}
              for details.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">6. Availability and changes</h2>
            <p className="mt-3">
              We work to keep AccessCheck reliable, but the service is provided
              on an as-available basis. We may update features, models, or
              these terms; material changes will be communicated in advance
              where reasonably possible.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">7. Liability</h2>
            <p className="mt-3">
              To the fullest extent permitted by law, our liability for the
              service is limited to the fees paid for it in the preceding
              twelve months. Nothing in these terms limits liability that
              cannot be limited under applicable law.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">8. Governing law</h2>
            <p className="mt-3">
              These terms are governed by the laws of England and Wales and
              subject to the exclusive jurisdiction of its courts.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold">9. Contact</h2>
            <p className="mt-3">
              Questions about these terms can be sent to
              {" "}
              <a className="underline" href="mailto:hello@accesscheck.uk">
                hello@accesscheck.uk
              </a>
              .
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
