import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { vendorDestinationSubmissionSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

const EDITABLE_STATUSES = ["DRAFT", "REJECTED"];

/** Vendor edits their own submission, or submits it for admin review. Can
 *  never touch `published` or `moderationStatus=APPROVED` directly — those
 *  are admin-only (enforced by simply never accepting those fields here). */
export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const { id } = await ctx.params;
  const body = await req.json();

  const existing = await prisma.destination.findUnique({ where: { id } });
  if (!existing || existing.submittedByAgentId !== session.agentId) return fail("Submission not found.", 404);
  if (!EDITABLE_STATUSES.includes(existing.moderationStatus)) {
    return fail("This submission is already under review or approved and can no longer be edited.", 409);
  }

  const submitForReview = body.action === "submit";

  // "Submit for review" alone (no edited fields) must not re-validate/require
  // the full form — the content was already valid when the draft was created
  // or last saved. Only re-validate when the agent actually edited fields.
  if (submitForReview && !body.details) {
    if (!existing.name || existing.name.trim().length < 2) {
      return fail("Add a name before submitting for review.", 422);
    }
    await prisma.destination.update({ where: { id }, data: { moderationStatus: "PENDING_REVIEW", rejectionReason: null } });
    await logAudit({ actorType: "AGENT", actorId: session.agentId, actorLabel: session.name, action: "destination.submit_for_review", entityType: "cms", entityId: id });
    return ok({ id, status: "PENDING_REVIEW" });
  }

  const d = vendorDestinationSubmissionSchema.parse(body.details ?? body);

  await prisma.destination.update({
    where: { id },
    data: {
      name: d.name,
      shortDescription: d.shortDescription || null,
      longDescription: d.longDescription || null,
      bestTime: d.bestTime || null,
      tripTypes: JSON.stringify(d.tripTypes ?? []),
      highlights: JSON.stringify(d.highlights ?? []),
      heroImage: d.heroImage || null,
      ...(submitForReview ? { moderationStatus: "PENDING_REVIEW", rejectionReason: null } : {}),
    },
  });
  if (submitForReview) {
    await logAudit({ actorType: "AGENT", actorId: session.agentId, actorLabel: session.name, action: "destination.submit_for_review", entityType: "cms", entityId: id });
  }
  return ok({ id, status: submitForReview ? "PENDING_REVIEW" : existing.moderationStatus });
});
