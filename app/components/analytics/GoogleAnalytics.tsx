"use client";

import Script from "next/script";

/**
 * GA4 in cookieless mode.
 *
 * Consent Mode v2 is set to denied before the tag loads and client_storage is
 * switched off, so GA4 sends cookieless pings: no _ga cookie is written and
 * nothing is stored on the visitor's device. That keeps GA4 on the same
 * no-banner footing as the other two layers.
 *
 * What you give up: user stitching across visits, and therefore most of GA4's
 * audience reporting. What you keep: channel and campaign attribution, which
 * is all GA4 is being asked for here — the human-vs-scanner question is
 * answered by PostHog and the HumanSignals events, not by this.
 *
 * If GA4 ever needs to be a primary tool rather than a reporting convenience,
 * that is the point to revisit consent properly.
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id) return null;

  return (
    <>
      <Script id="ga-consent" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            functionality_storage: 'denied',
            personalization_storage: 'denied',
            security_storage: 'granted'
          });
        `}
      </Script>

      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />

      <Script id="ga-init" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          gtag('config', '${id}', {
            client_storage: 'none',
            anonymize_ip: true,
            send_page_view: true
          });
        `}
      </Script>
    </>
  );
}
