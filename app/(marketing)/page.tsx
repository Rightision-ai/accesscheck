import Hero from "@/app/components/marketing/Hero";
import GradeShowcase from "@/app/components/marketing/GradeShowcase";
import HowItWorks from "@/app/components/marketing/HowItWorks";
import TaglineQuote from "@/app/components/marketing/TaglineQuote";
import StatsStrip from "@/app/components/marketing/StatsStrip";
import AudienceCards from "@/app/components/marketing/AudienceCards";
import FinalCTA from "@/app/components/marketing/FinalCTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsStrip />
      <GradeShowcase />
      <HowItWorks />
      <TaglineQuote />
      <AudienceCards />
      <FinalCTA />
    </>
  );
}
