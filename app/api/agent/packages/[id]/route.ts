import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { vendorPackageSubmissionSchema } from "@/lib/validation";
import { packageScalars, packageChildren } from "@/lib/cms/packageWrite";
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
  const children = packageChildren(d);

  // Replace children wholesale, same as the admin editor — a vendor edit
  // resubmits the full content set, not a partial patch.
  await prisma.$transaction([
    prisma.packageImage.deleteMany({ where: { packageId: id } }),
    prisma.packageItinerary.deleteMany({ where: { packageId: id } }),
    prisma.packageInclusion.deleteMany({ where: { packageId: id } }),
    prisma.packageExclusion.deleteMany({ where: { packageId: id } }),
    prisma.packageFAQ.deleteMany({ where: { packageId: id } }),
    prisma.tourPackage.update({
      where: { id },
      data: {
        ...packageScalars({ ...d, published: false, featured: false, sortOrder: existing.sortOrder, noindex: existing.noindex }),
        images: { create: children.images },
        itinerary: { create: children.itinerary },
        inclusions: { create: children.inclusions },
        exclusions: { create: children.exclusions },
        faqs: { create: children.faqs },
        ...(submitForReview ? { moderationStatus: "PENDING_REVIEW", rejectionReason: null } : {}),
      },
    }),
  ]);
  if (submitForReview) {
    await logAudit({ actorType: "AGENT", actorId: session.agentId, actorLabel: session.name, action: "package.submit_for_review", entityType: "cms", entityId: id });
  }
  return ok({ id, status: submitForReview ? "PENDING_REVIEW" : existing.moderationStatus });
});
