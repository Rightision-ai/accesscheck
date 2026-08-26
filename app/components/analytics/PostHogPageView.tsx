"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEmailIdentity } from "@/app/components/analytics/useEmailIdentity";

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
  const { cid, fromEmail, emailId } = useEmailIdentity(searchParams);

  // Bind the session to the contact token before any event is captured, so
  // every subsequent event on this visit — including verified_human — is
  // attributed to the same person rather than to an anonymous visitor.
  //
  // A caveat worth remembering: mail-security gateways detonate links too, and
  // they carry the cid with them. `cid` alone says "this link was followed",
  // not "this person read the page". Pair it with verified_human before
  // treating a visit as real.
  useEffect(() => {
    if (!posthog || !cid) return;
    posthog.identify(cid, { from_email: true, first_email_id: emailId });
  }, [posthog, cid, emailId]);

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
      utm_content: emailId,
      utm_term: searchParams?.get("utm_term") ?? null,

      // The opaque per-contact token. Resolves to a real person only via the
      // Loops contact record — never carries the address itself.
      cid,

      // from_email is the flag every "did a real person arrive?" query starts
      // from. Set once here rather than re-deriving it in each insight.
      from_email: fromEmail,

      // Present on most headless automation. Not proof on its own — plenty of
      // sandboxes hide it — but free to collect and occasionally decisive.
      is_webdriver:
        typeof navigator !== "undefined" && Boolean(navigator.webdriver),
    });
  }, [pathname, searchParams, posthog, cid, fromEmail, emailId]);

  return null;
}
