import type { Metadata } from "next";
import MarketingHeader from "@/app/components/marketing/MarketingHeader";
import MarketingFooter from "@/app/components/marketing/MarketingFooter";
import SkipLink from "@/app/components/marketing/SkipLink";

export const metadata: Metadata = {
  title: {
    default: "AccessCheck — Assess homes and assign accessibility categories using AI",
    template: "%s | AccessCheck",
  },
  description:
    "AccessCheck uses AI to assess homes from photos and floor plans, assigning a clear accessibility grade and producing DFG-ready reports.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[var(--text-main)]">
      <SkipLink />
      <MarketingHeader />
      <main id="main" className="flex-1 focus:outline-none" tabIndex={-1}>
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
