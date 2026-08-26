"use client";

import { useMemo } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";

/**
 * Reads the per-contact tracking token out of the URL.
 *
 * Loops emails carry `?cid=<token>` — an opaque 12-character string, one per
 * contact, stored on the Loops contact record as the `cid` property. The token
 * is deliberately NOT the email address: a URL parameter leaks into referrer
 * headers, server logs and every analytics payload, and these contacts are
 * named public-sector staff. The token means nothing to anyone who does not
 * already hold the Loops mapping.
 *
 * `none` is the fallback Loops substitutes when a contact has no token set.
 * Loops refuses to send an email whose merge field resolves to nothing, so the
 * fallback exists to keep the sequence flowing — but it is not an identity and
 * must never be treated as one.
 */

const NO_IDENTITY = "none";

export type EmailIdentity = {
  /** The opaque contact token, or null when absent/unresolved. */
  cid: string | null;
  /** Did this visit originate from a Loops email? */
  fromEmail: boolean;
  /** Which email in the sequence (utm_content), e.g. "e3". */
  emailId: string | null;
};

export function useEmailIdentity(
  searchParams: ReadonlyURLSearchParams | null,
): EmailIdentity {
  const raw = searchParams?.get("cid") ?? null;
  const source = searchParams?.get("utm_source") ?? null;
  const emailId = searchParams?.get("utm_content") ?? null;

  return useMemo(
    () => ({
      cid: raw && raw !== NO_IDENTITY ? raw : null,
      fromEmail: source === "loops",
      emailId,
    }),
    [raw, source, emailId],
  );
}
