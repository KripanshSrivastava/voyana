import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/agent", "/api", "/request-quote/success"],
    },
    sitemap: "http://localhost:3100/sitemap.xml",
  };
}
