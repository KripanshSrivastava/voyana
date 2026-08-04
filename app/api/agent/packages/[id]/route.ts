import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { vendorPackageSubmissionSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

const EDITABLE_STATUSES = ["DRAFT", "REJECTED"];

/** Vendor edits their own submission, or submits it for admin review. */
export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const { id } = await ctx.params;
  const body = await req.json();

  const existing = await prisma.tourPackage.findUnique({ where: { id } });
  if (!existing || existing.submittedByAgentId !== session.agentId) return fail("Submission not found.", 404);
  if (!EDITABLE_STATUSES.includes(existing.moderationStatus)) {
    return fail("This submission is already under review or approved and can no longer be edited.", 409);
  }

  const submitForReview = body.action === "submit";

  // Submit-only (no edited fields) must not re-require the full form.
  if (submitForReview && !body.details) {
    if (!existing.title || existing.title.trim().length < 2) {
      return fail("Add a title before submitting for review.", 422);
    }
    await prisma.tourPackage.update({ where: { id }, data: { moderationStatus: "PENDING_REVIEW", rejectionReason: null } });
    await logAudit({ actorType: "AGENT", actorId: session.agentId, actorLabel: session.name, action: "package.submit_for_review", entityType: "cms", entityId: id });
    return ok({ id, status: "PENDING_REVIEW" });
  }

  const d = vendorPackageSubmissionSchema.parse(body.details ?? body);

  await prisma.tourPackage.update({
    where: { id },
    data: {
      kind: d.kind,
      title: d.title,
      destinationId: d.destinationId || null,
      shortDescription: d.shortDescription || null,
      longDescription: d.longDescription || null,
      durationDays: d.durationDays ?? null,
      durationNights: d.durationNights ?? null,
      tripType: d.tripType || null,
      heroImage: d.heroImage || null,
      ...(submitForReview ? { moderationStatus: "PENDING_REVIEW", rejectionReason: null } : {}),
    },
  });
  if (submitForReview) {
    await logAudit({ actorType: "AGENT", actorId: session.agentId, actorLabel: session.name, action: "package.submit_for_review", entityType: "cms", entityId: id });
  }
  return ok({ id, status: submitForReview ? "PENDING_REVIEW" : existing.moderationStatus });
});
