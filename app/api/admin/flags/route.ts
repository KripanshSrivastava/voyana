import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { fail } from "@/lib/api";
import { revalidateSiteSettings } from "@/lib/cache/revalidate";

const FLAG_KEYS = ["vendorAdsEnabled", "autoBuyEnabled", "supportEnabled", "packageMarketplaceEnabled"] as const;

/** Toggle feature flags. High-impact — restricted to SUPER_ADMIN via the "flags" area. */
export const PATCH = handler(async (req: Request) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "flags");
  const body = await req.json();

  const data: Record<string, boolean> = {};
  for (const k of FLAG_KEYS) {
    if (typeof body[k] === "boolean") data[k] = body[k];
  }
  if (Object.keys(data).length === 0) return fail("No valid flag provided.", 422);

  await prisma.siteSetting.update({ where: { id: "default" }, data });
  revalidateSiteSettings();
  return ok({ updated: Object.keys(data) });
});
