import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { revalidateDestinations, revalidatePackages } from "@/lib/cache/revalidate";

type Ctx = { params: Promise<{ type: string; id: string }> };
const DECISIONS = ["APPROVED", "REJECTED"] as const;

/** Admin approves or rejects a vendor content submission. Approving does NOT
 *  publish it — admin still separately publishes via the normal CMS toggle,
 *  matching "Approve" and "Publish approved content" as distinct actions. */
export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "content");
  const { type, id } = await ctx.params;
  if (type !== "destination" && type !== "package") return fail("Invalid submission type.", 422);

  const { decision, reason } = await req.json();
  if (!DECISIONS.includes(decision)) return fail("Invalid decision.", 422);
  if (decision === "REJECTED" && (!reason || typeof reason !== "string" || !reason.trim())) {
    return fail("A rejection reason is required.", 422);
  }

  if (type === "destination") {
    const existing = await prisma.destination.findUnique({ where: { id }, select: { submittedByAgent: { select: { userId: true } }, moderationStatus: true, slug: true } });
    if (!existing || !existing.submittedByAgent) return fail("Submission not found.", 404);
    await prisma.destination.update({ where: { id }, data: { moderationStatus: decision, rejectionReason: decision === "REJECTED" ? reason.trim() : null } });
    revalidateDestinations(existing.slug);
    await notify({ userId: existing.submittedByAgent.userId, type: "system", title: decision === "APPROVED" ? "Destination submission approved" : "Destination submission rejected", body: decision === "REJECTED" ? reason.trim() : "An admin will publish it shortly.", href: "/agent/submissions" });
  } else {
    const existing = await prisma.tourPackage.findUnique({ where: { id }, select: { submittedByAgent: { select: { userId: true } }, moderationStatus: true, slug: true, kind: true } });
    if (!existing || !existing.submittedByAgent) return fail("Submission not found.", 404);
    await prisma.tourPackage.update({ where: { id }, data: { moderationStatus: decision, rejectionReason: decision === "REJECTED" ? reason.trim() : null } });
    revalidatePackages(existing.slug, existing.kind as "PACKAGE" | "TOUR");
    await notify({ userId: existing.submittedByAgent.userId, type: "system", title: decision === "APPROVED" ? "Package submission approved" : "Package submission rejected", body: decision === "REJECTED" ? reason.trim() : "An admin will publish it shortly.", href: "/agent/submissions" });
  }

  await logAudit({ actorType: "ADMIN", actorId: session.uid, actorLabel: session.name, action: `${type}.moderate`, entityType: "cms", entityId: id, metadata: { decision } });
  return ok({ id, decision });
});
