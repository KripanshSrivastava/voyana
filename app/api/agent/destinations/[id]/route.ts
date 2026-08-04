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

  const d = vendorDestinationSubmissionSchema.parse(body.details ?? body);
  const submitForReview = body.action === "submit";

  await prisma.destination.update({
    where: { id },
    data: {
      name: d.name,
      shortDescription: d.shortDescription || null,
      longDescription: d.longDescription || null,
      bestTime: d.bestTime || null,
      tripTypes: JSON.stringify(d.tripTypes ?? []),
      highlights: JSON.stringify(d.highlights ?? []),
      ...(submitForReview ? { moderationStatus: "PENDING_REVIEW", rejectionReason: null } : {}),
    },
  });
  if (submitForReview) {
    await logAudit({ actorType: "AGENT", actorId: session.agentId, actorLabel: session.name, action: "destination.submit_for_review", entityType: "cms", entityId: id });
  }
  return ok({ id, status: submitForReview ? "PENDING_REVIEW" : existing.moderationStatus });
});
