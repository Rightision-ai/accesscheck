import Image from "next/image";
import SolutionPage from "@/app/components/marketing/SolutionPage";

export const metadata = {
  title: "DFG-ready reports",
  description:
    "Defensible PDF reports with linked photo evidence, cost appendices and AccessCheck Accessibility Grade.",
};

function ReportsHero() {
  return (
    <figure className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[var(--primary-light)] to-transparent"
      />
      <div className="relative rounded-2xl bg-white border border-[var(--border)] shadow-2xl overflow-hidden lg:rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-7 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center gap-1.5 px-3"
        >
          <span className="block w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="block w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="block w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-[10px] font-semibold tracking-wide text-[var(--text-dim)] uppercase">
            AccessCheck report — sample.pdf
          </span>
        </div>
        <Image
          src="/assets/media/report-sample.png"
          alt="A sample AccessCheck PDF report showing the accessibility grade summary, photo evidence and costed adaptation appendix."
          width={1200}
          height={1600}
          priority
          className="block w-full h-auto pt-7"
        />
      </div>
      <figcaption className="sr-only">
        A sample AccessCheck PDF report — the artefact reviewers, panels and
        applicants actually receive at the end of an assessment.
      </figcaption>
    </figure>
  );
}

export default function ReportsPage() {
  return (
    <SolutionPage
      eyebrow="Reports"
      title="One PDF. Everything a panel needs."
      intro="The AccessCheck report is built for the people who actually read it: OTs, panel members, grant officers, applicants. Each section is structured so the evidence behind every finding is one click away."
      hero={<ReportsHero />}
      highlights={[
        "Accessibility Grade summary",
        "Linked photo evidence per finding",
        "Costed adaptation appendix",
        "Standards-aligned grading appendix",
      ]}
      body={[
        {
          heading: "Designed for review, not just generation",
          text: "Reports lead with the headline grade and the highest-impact issues, then drill into the rooms, the photos and the measurements. There’s no padding — nothing in the report is there unless a reviewer would actually use it.",
        },
        {
          heading: "Evidence you can defend",
          text: "Every finding links back to the photo, plan region or listing line that produced it. If a panel asks ‘why grade C?’, the answer is in the report — visible, evidenced and consistent across cases.",
        },
        {
          heading: "Drops straight into existing workflows",
          text: "Reports export as a single accessible PDF. They’re sized for email, named consistently, and built to be filed alongside DFG submissions, OT case notes and home improvement agency records.",
        },
      ]}
    />
  );
}
