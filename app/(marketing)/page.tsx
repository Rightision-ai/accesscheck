import Hero from "@/app/components/marketing/Hero";
import TaglineQuote from "@/app/components/marketing/TaglineQuote";
import StatsStrip from "@/app/components/marketing/StatsStrip";
import AudienceCards from "@/app/components/marketing/AudienceCards";
import FinalCTA from "@/app/components/marketing/FinalCTA";
import DemoPreview from "@/app/components/marketing/DemoPreview";
import AccessCheckMotionExplainer from "../components/marketing/AccessCheckMotionExplainer";
import LandlordCapabilities from "@/app/components/marketing/LandlordCapabilities";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsStrip />
      <AccessCheckMotionExplainer />
      <LandlordCapabilities />
      <DemoPreview />
      <TaglineQuote />
      <AudienceCards />
      <FinalCTA />
    </>
  );
}
