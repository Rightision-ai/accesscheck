"use client";

import Script from "next/script";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const CONSENT_STORAGE_KEY = "accesscheck-ga-consent";

type AnalyticsConsent = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __accessCheckGaLastPage?: string;
  }
}

function getStoredConsent(): AnalyticsConsent | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);

    if (value === "granted" || value === "denied") {
      return value;
    }
  } catch {
    // Continue without persisted consent if storage is unavailable.
  }

  return null;
}

function storeConsent(value: AnalyticsConsent) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Consent still applies to the current page if storage is unavailable.
  }
}

function deleteGoogleAnalyticsCookies() {
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim())
    .filter(
      (name): name is string =>
        Boolean(name) && (name === "_ga" || name.startsWith("_ga_")),
    );

  const rootDomain = window.location.hostname.replace(/^www\./, "");

  for (const name of cookieNames) {
    // Delete host-only cookie.
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;

    // Delete domain cookie.
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${rootDomain}; SameSite=Lax`;
  }
}

function sendPageView(measurementId: string) {
  if (!window.gtag) return;

  const pageLocation = window.location.href;

  // Prevent duplicate pageviews, including React Strict Mode effects.
  if (window.__accessCheckGaLastPage === pageLocation) {
    return;
  }

  const previousLocation = window.__accessCheckGaLastPage || document.referrer;

  window.gtag("event", "page_view", {
    send_to: measurementId,
    page_title: document.title,
    page_location: pageLocation,
    ...(previousLocation ? { page_referrer: previousLocation } : {}),
  });

  window.__accessCheckGaLastPage = pageLocation;
}

function GoogleAnalyticsPageViews({
  measurementId,
}: {
  measurementId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (getStoredConsent() !== "granted") {
      return;
    }

    // Wait for Next.js to update the document title and URL metadata.
    const frame = window.requestAnimationFrame(() => {
      sendPageView(measurementId);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [pathname, search, measurementId]);

  return null;
}

function GoogleAnalyticsConsentBanner({
  measurementId,
}: {
  measurementId: string;
}) {
  const [consent, setConsent] = useState<AnalyticsConsent | null | undefined>(
    undefined,
  );

  useEffect(() => {
    setConsent(getStoredConsent());
  }, []);

  function updateConsent(value: AnalyticsConsent) {
    storeConsent(value);

    window.gtag?.("consent", "update", {
      analytics_storage: value,

      // AccessCheck is not enabling Google advertising features.
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });

    setConsent(value);

    if (value === "granted") {
      // Track the landing page after consent is granted.
      window.requestAnimationFrame(() => {
        sendPageView(measurementId);
      });
    } else {
      deleteGoogleAnalyticsCookies();
      window.__accessCheckGaLastPage = undefined;
    }
  }

  // Wait until localStorage has been checked.
  if (consent === undefined) {
    return null;
  }

  // Show a persistent way to change the decision.
  if (consent !== null) {
    return (
      <button
        type="button"
        onClick={() => setConsent(null)}
        className="fixed bottom-4 left-4 z-[100] rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-main)] shadow-lg transition-colors hover:border-[var(--primary-dark)] hover:text-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
      >
        Cookie settings
      </button>
    );
  }

  return (
    <section
      role="dialog"
      aria-labelledby="ga-consent-title"
      aria-describedby="ga-consent-description"
      className="fixed inset-x-4 bottom-4 z-[110] mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xl md:p-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2
            id="ga-consent-title"
            className="text-lg font-bold text-[var(--text-main)]"
          >
            Google Analytics preferences
          </h2>

          <p
            id="ga-consent-description"
            className="mt-2 text-sm leading-6 text-[var(--text-dim)]"
          >
            We would like to use Google Analytics cookies to understand how
            people use AccessCheck and how they found us. These cookies are
            optional.
          </p>

          <a
            href="/privacy"
            className="mt-2 inline-block text-sm font-medium text-[var(--primary-dark)] underline underline-offset-2"
          >
            Read our privacy policy
          </a>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => updateConsent("denied")}
            className="min-h-11 rounded-lg border border-[var(--border)] bg-white px-5 py-2 text-sm font-semibold text-[var(--text-main)] transition-colors hover:border-[var(--primary-dark)] hover:text-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
          >
            Reject Google Analytics
          </button>

          <button
            type="button"
            onClick={() => updateConsent("granted")}
            className="min-h-11 rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
          >
            Allow Google Analytics
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * GA4 with Consent Mode v2.
 *
 * Analytics and advertising storage are denied by default.
 * Full GA4 measurement begins only after the visitor explicitly
 * allows Google Analytics.
 *
 * Pageviews are sent manually because Next.js uses client-side
 * navigation. GA's automatic initial pageview is therefore disabled.
 */
export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script id="ga-consent" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];

          function gtag() {
            dataLayer.push(arguments);
          }

          var savedAnalyticsConsent = null;

          try {
            savedAnalyticsConsent =
              window.localStorage.getItem(
                "${CONSENT_STORAGE_KEY}"
              );
          } catch (error) {
            savedAnalyticsConsent = null;
          }

          var initialAnalyticsConsent =
            savedAnalyticsConsent === "granted"
              ? "granted"
              : "denied";

          gtag("consent", "default", {
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied",
            analytics_storage: initialAnalyticsConsent,
            functionality_storage: "denied",
            personalization_storage: "denied",
            security_storage: "granted"
          });
        `}
      </Script>

      <Script
        id="ga-library"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />

      <Script id="ga-initialisation" strategy="afterInteractive">
        {`
          gtag("js", new Date());

          gtag("config", "${measurementId}", {
            send_page_view: false
          });
        `}
      </Script>

      <Suspense fallback={null}>
        <GoogleAnalyticsPageViews measurementId={measurementId} />
      </Suspense>

      <GoogleAnalyticsConsentBanner measurementId={measurementId} />
    </>
  );
}
