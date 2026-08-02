import { prisma } from "./db";
import { parseJson } from "./utils";

export type Socials = { facebook?: string; instagram?: string; twitter?: string; youtube?: string };

/** Site settings are a singleton row. Create-with-defaults on first access. */
export async function getSiteSettings() {
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
}

export async function getPublicSettings() {
  const s = await getSiteSettings();
  return {
    brandName: s.brandName,
    tagline: s.tagline,
    logoUrl: s.logoUrl,
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
}
