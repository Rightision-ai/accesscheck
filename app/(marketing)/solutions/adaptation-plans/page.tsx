import SolutionPage from "@/app/components/marketing/SolutionPage";
import AdaptationPlanHero from "@/app/components/marketing/AdaptationPlanHero";

export const metadata = {
  title: "Adaptation plans",
  description:
    "Costed, budget-aware adaptation recommendations grounded in recognised accessibility standards.",
};

export default function AdaptationPlansPage() {
  return (
    <SolutionPage
      eyebrow="Adaptation plans"
      title="Costed plans, not just observations."
      intro="AccessCheck doesn’t stop at flagging issues. It proposes specific adaptations, prices them, and shows how each one moves the home up the accessibility grade."
      hero={<AdaptationPlanHero />}
      highlights={[
        "Targeted recommendations per room",
        "Cost estimates with budget banding",
        "Grade impact for every adaptation",
        "Aligned to DFG funding thresholds",
      ]}
      body={[
        {
          heading: "Recommendations that respect the budget",
          text: "Plans are filtered against the budget you set. Whether the case has £7,500 of discretionary spend or a full DFG envelope, AccessCheck shows what is realistically achievable — and what would require additional funding.",
        },
        {
          heading: "Grounded in recognised standards",
          text: "Adaptation suggestions reference the Wheelchair Housing Design Guide, Lifetime Homes and Building Regulations Part M, so reviewers can see why each item was recommended.",
        },
        {
          heading: "Editable, defensible, exportable",
          text: "OTs can adjust quantities, prices and notes before a plan is finalised. The result drops directly into the AccessCheck PDF report, alongside the photo evidence that justified each item.",
        },
      ]}
    />
  );
}
