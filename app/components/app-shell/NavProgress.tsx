"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, type ReactNode } from "react";

/**
 * Navigation feedback for the app shell.
 *
 * A route change here means a server round trip — the page's data is fetched before
 * anything renders — so without this the app looks frozen between the click and the new
 * screen. `useLinkStatus` reports that gap per link, which gives the clicked item its own
 * spinner and drives the bar across the top of the shell.
 */

/** Reports which links are mid-navigation. Keyed so several links can settle out of order. */
export type PendingReporter = (id: string, pending: boolean) => void;

export function TopProgressBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-primary-light"
      role="progressbar"
      aria-label="Loading page"
    >
      <div className="ac-route-progress h-full w-2/5 rounded-full bg-primary" />
    </div>
  );
}

/**
 * A `next/link` that tells the shell when it is loading and hands its own pending state to
 * its children, so the item can show a spinner where its icon was.
 */
export function PendingLink({
  id,
  href,
  report,
  className,
  title,
  role,
  onClick,
  children,
}: {
  id: string;
  href: string;
  report?: PendingReporter;
  className?: string;
  title?: string;
  role?: string;
  onClick?: () => void;
  children: (pending: boolean) => ReactNode;
}) {
  return (
    <Link href={href} className={className} title={title} role={role} onClick={onClick}>
      <LinkBody id={id} report={report}>
        {children}
      </LinkBody>
    </Link>
  );
}

/** useLinkStatus only reports inside a Link, so the body has to be its own component. */
function LinkBody({
  id,
  report,
  children,
}: {
  id: string;
  report?: PendingReporter;
  children: (pending: boolean) => ReactNode;
}) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    report?.(id, pending);
    // Clear on unmount too: the shell is remounted by some navigations, and a link that
    // disappears mid-flight would otherwise leave the bar running forever.
    return () => report?.(id, false);
  }, [id, pending, report]);
  return <>{children(pending)}</>;
}

/** Spinner sized to sit where a 18px nav icon was. */
export function NavSpinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4.5 w-4.5 shrink-0 animate-spin rounded-full border-2 border-current/25 border-t-current"
    />
  );
}
