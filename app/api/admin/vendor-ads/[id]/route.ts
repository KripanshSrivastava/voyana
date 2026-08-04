import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { VENDOR_AD_STATUSES } from "@/lib/constants";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { revalidateVendorAds } from "@/lib/cache/revalidate";

/** Admin moderates a vendor ad (approve/reject/pause). "marketing" area. */
export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "marketing");
  const { id } = await ctx.params;
  const { status } = await req.json();
  if (!VENDOR_AD_STATUSES.includes(status)) return fail("Invalid ad status.", 422);

  const ad = await prisma.vendorAd.findUnique({ where: { id }, include: { agent: true } });
  if (!ad) return fail("Ad not found.", 404);

  await prisma.vendorAd.update({ where: { id }, data: { status } });
  revalidateVendorAds();
  await logAudit({ actorType: "ADMIN", actorId: session.uid, actorLabel: session.name, action: "ad.moderate", entityType: "cms", entityId: id, metadata: { from: ad.status, to: status } });
  if (status === "APPROVED" || status === "REJECTED") {
    await notify({ userId: ad.agent.userId, type: "system", title: `Ad ${status === "APPROVED" ? "approved" : "rejected"}`, body: ad.title, href: "/agent/ads" });
  }
  return ok({ id, status });
});
