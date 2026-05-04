import Image from "next/image";

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
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)]">
            A service by Foundations,
            <p className="mt-2">
              Powered by
              <Image
                src="/assets/media/rightision-logo.png"
                alt="Rightision"
                width={50}
                height={50}
                className="h-12 w-auto ml-2"
              />
            </p>
          </h1>
          <h2 className="text-3xl">
            for the people making housing accessible.
          </h2>
          <p className="mt-5 text-lg text-[var(--text-dim)] leading-relaxed">
            AccessCheck is built by Foundations — the national body for home
            improvement agencies in England — and Rightision to help OTs, local
            authorities and charities assess homes faster, more consistently,
            and with evidence that holds up to review. Rightision is the AI
            engine behind AccessCheck. It combines computer vision, spatial
            reasoning and large language models to interpret floor plans and
            property photos, extract geometry and features, and grade
            accessibility against recognised housing standards.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 grid grid-cols-1  py-8 gap-8">
          <article>
            <h2 className="text-2xl font-bold text-[var(--text-main)]">
              Who AccessCheck is for
            </h2>
            <p className="mt-3 text-[var(--text-main)] leading-relaxed">
              Occupational therapists, local authority housing teams, home
              improvement agencies, charities supporting disabled applicants,
              and the applicants themselves. Wherever an accessibility decision
              is being made about a home, AccessCheck aims to make that decision
              faster, fairer and more evidenced.
            </p>
          </article>
          <article>
            <h2 className="text-2xl font-bold text-[var(--text-main)]">
              How we approach accessibility
            </h2>
            <p className="mt-3 text-[var(--text-main)] leading-relaxed">
              Our grading is grounded in recognised standards — the Wheelchair
              Housing Design Guide, Housing Corporation Scheme Development
              Standards, Lifetime Homes and Building Regulations Part M. Every
              grade is supported by photographic, geometric or listing evidence
              so reviewers can see exactly how it was reached.
            </p>
          </article>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">
                What the engine does
              </h3>
              <p className="mt-2 text-[var(--text-main)] leading-relaxed">
                Rightision AI engine identifies rooms, doorways, fixtures and
                circulation space from imagery, infers measurements where plans
                lack annotation, and produces evidence-backed scores aligned to
                Building Regulations Part M, Lifetime Homes and the Wheelchair
                Housing Design Guide.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">
                Why it matters
              </h3>
              <p className="mt-2 text-[var(--text-main)] leading-relaxed">
                Every grade AccessCheck surfaces is generated and explained by
                the Rightision AI engine, with the underlying photos, geometry
                and listings attached so reviewers and applicants can see how
                each decision was reached.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
