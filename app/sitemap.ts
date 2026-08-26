import type { MetadataRoute } from "next";

const routes = ["", "/technology", "/about", "/contact", "/demo"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.accesscheck.co.uk";

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
