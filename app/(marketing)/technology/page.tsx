import type { Metadata } from "next";
import TechnologyHero from "@/app/components/marketing/TechnologyHero";
import TechnologyHowItWorks from "@/app/components/marketing/TechnologyHowItWorks";
import ComputerVisionModel from "@/app/components/marketing/ComputerVisionModel";
import TechnologyCTA from "@/app/components/marketing/TechnologyCTA";

export const metadata: Metadata = {
  title: "Technology",
  description:
    "Inside the Rightision Accessibility Scoring Engine — computer vision and deep learning that turn photos and plans into evidence-backed accessibility categories.",
};

export default function TechnologyPage() {
  return (
    <>
      <TechnologyHero />
      <TechnologyHowItWorks />
      <ComputerVisionModel />
      <TechnologyCTA />
    </>
  );
}
