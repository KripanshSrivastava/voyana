import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

// Rendered per-request, not at build time. Two reasons: (1) the sitemap
// reflects live DB content (new destinations/packages should appear without
// a rebuild), and (2) a DB hiccup during `next build` used to crash the
// whole deploy — treating this as dynamic isolates that failure and lets
// static crawls still get a valid sitemap on the next hit.
export const dynamic = "force-dynamic";

const STATIC_PATHS = ["", "/destinations", "/packages", "/tours", "/how-it-works", "/about", "/contact", "/request-quote"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "");
  const staticRoutes = STATIC_PATHS.map((p) => ({ url: `${base}${p}`, lastModified: new Date() }));

  // If the DB is briefly unreachable, still return the static portion rather
  // than 500ing the whole sitemap — crawlers will pick up the dynamic parts
  // on the next request.
  try {
    const [destinations, packages] = await Promise.all([
      prisma.destination.findMany({ where: { published: true, noindex: false }, select: { slug: true, updatedAt: true } }),
      prisma.tourPackage.findMany({ where: { published: true, noindex: false }, select: { slug: true, kind: true, updatedAt: true } }),
    ]);
    return [
      ...staticRoutes,
      ...destinations.map((d) => ({ url: `${base}/destinations/${d.slug}`, lastModified: d.updatedAt })),
      ...packages.map((p) => ({ url: `${base}/${p.kind === "TOUR" ? "tours" : "packages"}/${p.slug}`, lastModified: p.updatedAt })),
    ];
  } catch (e) {
    console.error("[sitemap] DB read failed, returning static-only fallback:", e);
    return staticRoutes;
  }
}
