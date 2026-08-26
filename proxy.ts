import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - ingest (PostHog reverse proxy — MUST be excluded, otherwise the
     *   Supabase session middleware intercepts analytics beacons and they
     *   never reach PostHog)
     * - _vercel (Vercel Web Analytics first-party endpoint)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|ingest|_vercel|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
