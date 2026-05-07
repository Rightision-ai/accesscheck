export const metadata = {
  title: "About",
  description:
    "About AccessCheck — a service by Foundations, powered by the Rightision AI engine.",
};

export default function AboutPage() {
  return (
    <>
      <section>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 ">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
            About
          </p>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)]">
            A service by{" "}
            <span className="text-[var(--primary-dark)]">Foundations</span>
            <p className="mt-3 text-2xl">
              Powered by <span className="text-indigo-800">Rightision</span>
            </p>
          </h1>
          <h2 className="text-xl mt-2">
            for social landlords and the teams making housing accessible.
          </h2>
          <p className="mt-5 text-md text-[var(--text-dim)] leading-relaxed">
            AccessCheck is built by Foundations — the national body for home
            improvement agencies in England — and Rightision to help social
            landlords, local authorities, occupational therapists and charities
            understand the accessibility of homes faster, more consistently, and
            with evidence that holds up to review. Rightision is the AI engine
            behind AccessCheck. It combines computer vision, spatial reasoning
            and large language models to interpret floor plans and property
            photos, extract geometry and features, and assign a clear
            accessibility category against recognised housing guidance.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 grid grid-cols-1  py-8 gap-8">
          <article>
            <h2 className="text-2xl font-bold text-[var(--text-main)]">
              Who AccessCheck is for
            </h2>
            <p className="mt-3 text-[var(--text-dim)] leading-relaxed">
              Social landlords, local authority housing teams, occupational
              therapists, home improvement agencies and charities supporting
              disabled tenants and applicants. Wherever an accessibility
              decision is being made about a home, AccessCheck aims to make that
              decision faster, fairer and more evidenced.
            </p>
          </article>
          <article>
            <h2 className="text-2xl font-bold text-[var(--text-main)]">
              How we approach accessibility
            </h2>
            <p className="mt-3 text-[var(--text-dim)] leading-relaxed">
              Our categories are informed by established access and housing
              design guidance — including the Wheelchair Housing Design Guide,
              Housing Corporation Scheme Development Standards, Lifetime Homes
              and Building Regulations Part M. Every category is supported by
              photographic, geometric or listing evidence so reviewers can see
              exactly how it was reached.
            </p>
          </article>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">
                What the engine does
              </h3>
              <p className="mt-2 text-[var(--text-dim)] leading-relaxed">
                The Rightision AI engine identifies rooms, doorways, fixtures
                and circulation space from imagery, infers measurements where
                plans lack annotation, and produces evidence-backed
                accessibility categories informed by Building Regulations Part
                M, Lifetime Homes and the Wheelchair Housing Design Guide.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">
                Why it matters
              </h3>
              <p className="mt-2 text-[var(--text-dim)] leading-relaxed">
                Every accessibility category AccessCheck surfaces is generated
                and explained by the Rightision AI engine, with the underlying
                photos, geometry and listings attached so reviewers, landlords
                and tenants can see how each decision was reached.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
