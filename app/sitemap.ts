import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const BASE = "http://localhost:3100";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinations, packages] = await Promise.all([
    prisma.destination.findMany({ where: { published: true, noindex: false }, select: { slug: true, updatedAt: true } }),
    prisma.tourPackage.findMany({ where: { published: true, noindex: false }, select: { slug: true, kind: true, updatedAt: true } }),
  ]);

  const staticRoutes = ["", "/destinations", "/packages", "/tours", "/how-it-works", "/about", "/contact", "/request-quote"].map(
    (p) => ({ url: `${BASE}${p}`, lastModified: new Date() })
  );

  return [
    ...staticRoutes,
    ...destinations.map((d) => ({ url: `${BASE}/destinations/${d.slug}`, lastModified: d.updatedAt })),
    ...packages.map((p) => ({ url: `${BASE}/${p.kind === "TOUR" ? "tours" : "packages"}/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
