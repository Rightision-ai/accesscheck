import SolutionPage from "@/app/components/marketing/SolutionPage";

export const metadata = {
  title: "Image analysis",
  description:
    "Detect grab rails, thresholds, wet rooms and more from existing photos with computer vision.",
};

export default function ImageAnalysisPage() {
  return (
    <SolutionPage
      eyebrow="Image analysis"
      title="Photos become evidence."
      intro="AccessCheck reads the photos you already have — listing shots, OT site photos, family-supplied images — and pulls out the accessibility-relevant detail."
      highlights={[
        "Grab rails, level access, ramps",
        "Step heights and thresholds",
        "Wet rooms and accessible WC fixtures",
        "Trip hazards and circulation issues",
      ]}
      body={[
        {
          heading: "Detection that grounds every claim",
          text: "Each finding is anchored to the exact image and region it came from. If the report says ‘grab rails detected in bathroom’, you can click through to the photo. That traceability is what makes the assessment defensible.",
        },
        {
          heading: "Works with the photos you already have",
          text: "No special equipment, no LiDAR, no scheduled re-visits. AccessCheck makes use of existing imagery — including HEIC iPhone shots — so OTs and home improvement agencies can move faster on cases they’re already working.",
        },
        {
          heading: "Surfaces conflicts with listing text",
          text: "If a listing description and the photographs disagree, AccessCheck flags it. That single feature alone tends to catch a meaningful share of hidden barriers before an applicant ever views a property.",
        },
      ]}
    />
  );
}
