import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";

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
  await prisma.siteSetting.update({ where: { id: "default" }, data });
  return ok({ updated: Object.keys(data) });
});
