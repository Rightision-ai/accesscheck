import type { Metadata } from "next";
import MarketingHeader from "@/app/components/marketing/MarketingHeader";
import MarketingFooter from "@/app/components/marketing/MarketingFooter";
import SkipLink from "@/app/components/marketing/SkipLink";

export const metadata: Metadata = {
  title: {
    default: "AccessCheck — Stock intelligence for accessible housing",
    template: "%s | AccessCheck",
  },
  description:
    "AccessCheck helps social landlords assess the accessibility of their homes using photos, floor plans and property data — supporting better allocations, clearer records and earlier understanding of adaptation potential.",
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
