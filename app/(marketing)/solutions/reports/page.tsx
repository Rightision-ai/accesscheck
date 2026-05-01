import SolutionPage from "@/app/components/marketing/SolutionPage";

export const metadata = {
  title: "DFG-ready reports",
  description:
    "Defensible PDF reports with linked photo evidence, cost appendices and AccessCheck Accessibility Grade.",
};

export default function ReportsPage() {
  return (
    <SolutionPage
      eyebrow="Reports"
      title="One PDF. Everything a panel needs."
      intro="The AccessCheck report is built for the people who actually read it: OTs, panel members, grant officers, applicants. Each section is structured so the evidence behind every finding is one click away."
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
