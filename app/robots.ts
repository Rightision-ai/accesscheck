import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/dashboard/", "/api/"],
    },
    sitemap: "https://www.accesscheck.co.uk/sitemap.xml",
    host: "https://www.accesscheck.co.uk",
  };
}
