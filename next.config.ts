import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },

  // PostHog is proxied through our own domain so that corporate mail gateways
  // and council network filters — which commonly block *.posthog.com — cannot
  // silently drop analytics. Vercel Web Analytics needs no proxy: it is already
  // served first-party from /_vercel/insights.
  //
  // skipTrailingSlashRedirect is required, otherwise Next issues a 308 on the
  // ingest paths and the PostHog client drops the payload.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://eu.i.posthog.com/decide",
      },
    ];
  },
};

export default nextConfig;
