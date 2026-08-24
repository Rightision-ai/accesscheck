"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";

/**
 * Captures a pageview on first load and on every App Router client-side
 * navigation, and stamps the email-campaign parameters onto it.
 *
 * PostHog reads utm_* automatically, but we also promote them to top-level
 * event properties so they can be filtered on without digging into the
 * initial-person payload — which, under memory persistence, does not survive.
 */
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (!pathname || !posthog) return;

    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;

    posthog.capture("$pageview", {
      $current_url: url,
      utm_source: searchParams?.get("utm_source") ?? null,
      utm_medium: searchParams?.get("utm_medium") ?? null,
      utm_campaign: searchParams?.get("utm_campaign") ?? null,
      utm_content: searchParams?.get("utm_content") ?? null,
      utm_term: searchParams?.get("utm_term") ?? null,

      // from_email is the flag every "did a real person arrive?" query starts
      // from. Set once here rather than re-deriving it in each insight.
      from_email: searchParams?.get("utm_source") === "loops",

      // Present on most headless automation. Not proof on its own — plenty of
      // sandboxes hide it — but free to collect and occasionally decisive.
      is_webdriver: typeof navigator !== "undefined" && Boolean(navigator.webdriver),
    });
  }, [pathname, searchParams, posthog]);

  return null;
}
