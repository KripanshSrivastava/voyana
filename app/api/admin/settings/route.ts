import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { settingsSchema } from "@/lib/validation";
import { revalidateSiteSettings } from "@/lib/cache/revalidate";

export const PATCH = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const s = settingsSchema.parse(await req.json());

  // Throws on failure — handler() turns that into a proper error response,
  // so a failed write never falls through to the success return below.
  const saved = await prisma.siteSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...toData(s),
    },
    update: toData(s),
  });
  revalidateSiteSettings();
  return ok({ saved: true, updatedAt: saved.updatedAt });
});

function toData(s: ReturnType<typeof settingsSchema.parse>) {
  return {
    brandName: s.brandName,
    tagline: s.tagline || "",
    logoUrl: s.logoUrl || null,
    heroImage: s.heroImage || null,
    faviconUrl: s.faviconUrl || null,
    phone: s.phone || null,
    whatsapp: s.whatsapp || null,
    email: s.email || null,
    address: s.address || null,
    socials: JSON.stringify(s.socials ?? {}),
    defaultLeadPrice: s.defaultLeadPrice,
    leadMaxAgents: s.leadMaxAgents,
    leadExpiryHours: s.leadExpiryHours,
    leadValidityDays: s.leadValidityDays,
    priceSharedDomestic: s.priceSharedDomestic,
    priceSharedInternational: s.priceSharedInternational,
    priceExclusiveDomestic: s.priceExclusiveDomestic,
    priceExclusiveInternational: s.priceExclusiveInternational,
    footerText: s.footerText || null,
    defaultSeoTitle: s.defaultSeoTitle || null,
    defaultSeoDescription: s.defaultSeoDescription || null,
    gaId: s.gaId || null,
    metaPixelId: s.metaPixelId || null,
    googleAdsId: s.googleAdsId || null,
  };
}
