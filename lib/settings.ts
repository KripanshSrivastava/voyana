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

export async function getPublicSettings() {
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
}
