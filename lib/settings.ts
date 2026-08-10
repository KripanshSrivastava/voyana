import { unstable_cache } from "next/cache";
import { prisma, withReadRetry } from "./db";
import { parseJson } from "./utils";
import { cached } from "./cache/publicCache";

export type Socials = { facebook?: string; instagram?: string; twitter?: string; youtube?: string };

/**
 * Site settings are a singleton row. Always read live from the database —
 * this function also feeds feature flags (getFlags()) and business numbers
 * (leadMaxAgents, defaultLeadPrice) used by lead ingestion/purchase, so it
 * must never be cache-stale. Only the narrower getPublicSettings() below,
 * used purely for public marketing chrome, is cached.
 */
export async function getSiteSettings() {
  return withReadRetry(async () => {
    const existing = await prisma.siteSetting.findUnique({ where: { id: "default" } });
    if (existing) return existing;
    try {
      return await prisma.siteSetting.upsert({
        where: { id: "default" },
        create: { id: "default" },
        update: {},
      });
    } catch {
      // Concurrent first-access (layout + page render in parallel on Postgres) can
      // race two INSERTs — one wins, the other hits a unique violation. Re-read.
      const row = await prisma.siteSetting.findUnique({ where: { id: "default" } });
      if (row) return row;
      throw new Error("Failed to initialise site settings");
    }
  });
}

/**
 * Public settings render on every page's layout. Two layers:
 *
 *  1. Next.js `unstable_cache` — participates in Next's own data cache, so
 *     static prerender doesn't bail to dynamic (which the raw Upstash REST
 *     `no-store` fetch used to do), and pages with `export const revalidate`
 *     actually get cached HTML.
 *  2. Upstash Redis (via `cached()`) — cross-instance cache when Next's
 *     per-instance data cache misses, so a cold Vercel invocation still
 *     avoids the DB round-trip.
 *
 * Invalidation: admin mutations call `revalidateTag("site-settings")` from
 * lib/cache/revalidate.ts, which flushes both layers.
 */
export const getPublicSettings = unstable_cache(
  async () => {
    return cached("site-settings", 120, async () => {
      const s = await getSiteSettings();
      return {
        brandName: s.brandName,
        tagline: s.tagline,
        logoUrl: s.logoUrl,
        faviconUrl: s.faviconUrl,
        heroImage: s.heroImage,
        phone: s.phone,
        whatsapp: s.whatsapp,
        email: s.email,
        address: s.address,
        footerText: s.footerText,
        socials: parseJson<Socials>(s.socials, {}),
        defaultSeoTitle: s.defaultSeoTitle,
        defaultSeoDescription: s.defaultSeoDescription,
        gaId: s.gaId,
        metaPixelId: s.metaPixelId,
        googleAdsId: s.googleAdsId,
      };
    });
  },
  ["public-settings"],
  { revalidate: 120, tags: ["site-settings"] },
);
