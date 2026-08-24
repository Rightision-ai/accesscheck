"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

/**
 * PostHog, configured for a UK public-sector audience.
 *
 * Two deliberate choices:
 *
 * 1. persistence: "memory" — no cookies, no localStorage, no sessionStorage.
 *    Nothing is written to the visitor's device, so PECR's storage-consent
 *    trigger is never pulled and the site needs no cookie banner for this.
 *    The trade-off: a visitor who reloads the page is counted as a new person.
 *    Within a single visit (including client-side navigation) identity holds,
 *    which is all the human-vs-scanner question needs.
 *
 * 2. api_host: "/ingest" — proxied through our own domain. Council networks
 *    routinely blocklist analytics vendors by hostname; first-party requests
 *    survive that.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!key) return; // no key in this environment — stay silent, don't throw

    posthog.init(key, {
      api_host: "/ingest",
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,

      persistence: "memory",
      disable_persistence: false,

      // We capture pageviews by hand: the App Router does client-side
      // navigation, which PostHog's automatic capture does not see.
      capture_pageview: false,
      capture_pageleave: true,

      autocapture: true,
      disable_session_recording: false,

      // Drop traffic PostHog already recognises as automated. This catches the
      // honest crawlers; the mail-security sandboxes that matter are caught by
      // the engagement signals in HumanSignals.tsx instead.
      opt_out_useragent_filter: false,

      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") ph.debug();
      },
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
