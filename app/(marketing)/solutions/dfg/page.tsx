import SolutionPage from "@/app/components/marketing/SolutionPage";

export const metadata = {
  title: "Disabled Facilities Grant (DFG)",
  description:
    "How AccessCheck helps OTs, applicants and home improvement agencies prepare faster, better-evidenced DFG applications.",
};

export default function DfgPage() {
  return (
    <SolutionPage
      eyebrow="Disabled Facilities Grant"
      title="Make DFG applications faster — and harder to refuse."
      intro="The Disabled Facilities Grant helps disabled people fund the adaptations they need to live safely and independently at home. AccessCheck is built to make those applications quicker to prepare and easier for panels to approve."
      highlights={[
        "Photo-grounded evidence in every report",
        "Recommendations costed to DFG thresholds",
        "Accessibility Grade panels can compare against",
        "Conflicts between listings and reality flagged early",
      ]}
      body={[
        {
          heading: "What the DFG is, in plain English",
          text: "A Disabled Facilities Grant is local-authority funding that pays for adaptations — ramps, level access showers, stair lifts and more — that help a disabled person live independently in their home. Applications usually need an OT recommendation, photo evidence of the property, and a costed plan of the proposed works.",
        },
        {
          heading: "Where AccessCheck fits in",
          text: "AccessCheck takes the evidence-gathering, measuring and costing pieces and accelerates them. OTs spend less time scaling drawings and writing up; applicants get a clear picture of what their home needs; panels get a consistent, defensible package to review.",
        },
        {
          heading: "Better evidence, fewer back-and-forths",
          text: "When a panel can click from a recommendation back to the photo or measurement that justified it, queries go down. Fewer queries means faster decisions — and faster decisions mean adaptations get installed sooner.",
        },
      ]}
    />
  );
}
