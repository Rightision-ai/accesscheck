import SolutionPage from "@/app/components/marketing/SolutionPage";

export const metadata = {
  title: "Floor plan analysis",
  description:
    "Measure doorway widths, turning circles and level access from existing floor plans — automatically.",
};

export default function FloorPlanAnalysisPage() {
  return (
    <SolutionPage
      eyebrow="Floor plan analysis"
      title="Measurements straight from the drawing."
      intro="Upload an existing floor plan and AccessCheck extracts the dimensions that matter for accessibility — no site visit, no manual scaling."
      highlights={[
        "Room and corridor widths",
        "Doorway clear widths",
        "Wheelchair turning circles",
        "Level access and step detection",
      ]}
      body={[
        {
          heading: "From PDF or image to defensible measurements",
          text: "Our pipeline detects rooms, fixtures and openings on the plan, then geometrically validates whether each space meets recognised accessibility thresholds. Every measurement is linked to the source drawing, so reviewers can verify what the AI saw.",
        },
        {
          heading: "Built around recognised standards",
          text: "Thresholds reflect the Wheelchair Housing Design Guide, Lifetime Homes and Building Regulations Part M, so results align with what panels and grant officers already trust.",
        },
        {
          heading: "Catches conflicts the eye misses",
          text: "AccessCheck cross-checks plan geometry against listing claims and on-site photos. If a listing says ‘step-free’ but the plan or photo shows a 50 mm threshold, you’ll see the conflict surfaced — not buried.",
        },
      ]}
    />
  );
}
