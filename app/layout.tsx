import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import "@/app/globals.css";

import { PostHogProvider } from "@/app/providers";
import { PostHogPageView } from "@/app/components/analytics/PostHogPageView";
import { HumanSignals } from "@/app/components/analytics/HumanSignals";
import { GoogleAnalytics } from "@/app/components/analytics/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AccessCheck Dashboard",
  description: "AccessCheck Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <PostHogProvider>
          {/*
            useSearchParams() forces client-side rendering of anything that
            calls it. Both of these are wrapped in Suspense so that only the
            (empty) analytics components opt out of static rendering — without
            this, every page in the app becomes dynamic.
          */}
          <Suspense fallback={null}>
            <PostHogPageView />
            <HumanSignals />
          </Suspense>

          <Toaster richColors position="top-right" />
          {children}
        </PostHogProvider>

        {/* First-party, cookieless, served from /_vercel/insights — council
            network filters cannot block it the way they block vendor domains. */}
        <Analytics />
      </body>
    </html>
  );
}
