import SolutionPage from "@/app/components/marketing/SolutionPage";
import AdaptationPlanHero from "@/app/components/marketing/AdaptationPlanHero";

export const metadata = {
  title: "Adaptation plans",
  description:
    "Understand where adaptations are realistic, limited or unlikely — with costed recommendations grounded in recognised accessibility guidance.",
};

export default function AdaptationPlansPage() {
  return (
    <SolutionPage
      eyebrow="Adaptation plans"
      title="See where adaptations are realistic — and where they’re not."
      intro="AccessCheck doesn’t stop at flagging issues. It highlights where adaptations may be realistic, limited or unlikely to provide a good long-term solution — with costed recommendations and clear notes on what each change would mean for the home."
      hero={<AdaptationPlanHero />}
      highlights={[
        "Feasibility notes for each adaptation",
        "Targeted recommendations per room",
        "Cost estimates with budget banding",
        "Aligned to common funding thresholds, including DFG",
      ]}
      body={[
        {
          heading: "Recommendations that respect the budget",
          text: "Plans are filtered against the budget you set. Whether the case has £7,500 of discretionary spend or a full Disabled Facilities Grant envelope, AccessCheck shows what is realistically achievable — and what would require additional funding or planned investment.",
        },
        {
          heading: "Informed by recognised guidance",
          text: "Adaptation suggestions reference the Wheelchair Housing Design Guide, Lifetime Homes and Building Regulations Part M, so landlords, occupational therapists and reviewers can see why each item was recommended.",
        },
        {
          heading: "Editable, evidenced, exportable",
          text: "Asset, adaptations and OT teams can adjust quantities, prices and notes before a plan is finalised. The result drops directly into the AccessCheck property-level report, alongside the photo evidence that supports each item.",
        },
      ]}
    />
  );
}
