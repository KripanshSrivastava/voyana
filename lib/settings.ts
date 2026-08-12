import { unstable_cache } from "next/cache";
import { prisma, withReadRetry } from "./db";
import { parseJson } from "./utils";
import { cached } from "./cache/publicCache";

export type Socials = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  pinterest?: string;
  linkedin?: string;
};

/**
 * Values that match the `SiteSetting` defaults in `prisma/schema.prisma`.
 * Used as a fallback when the database is unreachable — most notably at
 * Docker build time (`next build` prerenders `/_not-found` which walks the
 * root layout's `generateMetadata`, and there's no DB in the builder image).
 * At runtime the real row is loaded and this branch never fires.
 *
 * NOTE: kept in-sync with `SiteSetting` defaults by hand. When the schema
 * defaults change, update these too.
 */
const FALLBACK_SETTINGS = {
  id: "default" as const,
  brandName: "Moksh Booking",
  tagline: "Your trip. Your way.",
  logoUrl: null as string | null,
  heroImage: null as string | null,
  faviconUrl: null as string | null,
  phone: null as string | null,
  whatsapp: null as string | null,
  email: null as string | null,
  address: null as string | null,
  socials: null as string | null,
  defaultLeadPrice: 750,
  leadMaxAgents: 2,
  leadExpiryHours: 72,
  leadValidityDays: 365,
  priceSharedDomestic: 1,
  priceSharedInternational: 1,
  priceExclusiveDomestic: 2,
  priceExclusiveInternational: 2,
  adCostPerClickCredits: 10,
  footerText: null as string | null,
  defaultSeoTitle: null as string | null,
  defaultSeoDescription: null as string | null,
  gaId: null as string | null,
  metaPixelId: null as string | null,
  googleAdsId: null as string | null,
  vendorAdsEnabled: false,
  autoBuyEnabled: true,
  supportEnabled: true,
  packageMarketplaceEnabled: false,
  updatedAt: new Date(0),
};

/** True when the process was started by `next build` — production compile,
 *  not `next start`. Prisma queries during `next build` prerender pages
 *  against whatever env is available, so if the DB is unreachable we want
 *  a graceful fallback rather than a hard failure. */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * Site settings are a singleton row. Always read live from the database in
 * production — this function also feeds feature flags (getFlags()) and
 * business numbers (leadMaxAgents, defaultLeadPrice) used by lead
 * ingestion/purchase, so at runtime it must never be cache-stale.
 *
 * The one exception: during `next build`, if the DB is unreachable (typical
 * inside a Docker builder or CI runner without prod DB access), we return
 * FALLBACK_SETTINGS so the build can finish. This never affects real user
 * traffic; the first live request re-hits the DB.
 */
export async function getSiteSettings() {
  try {
    return await withReadRetry(async () => {
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
  } catch (err) {
    if (isBuildPhase()) {
      // Expected during Docker builds: log once so developers know the fallback
      // was used, but don't fail the build.
      console.warn("[settings] DB unreachable during build — using FALLBACK_SETTINGS.");
      return FALLBACK_SETTINGS;
    }
    throw err;
  }
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
