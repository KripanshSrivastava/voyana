import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getFlags } from "@/lib/flags";
import { vendorPackageSubmissionSchema } from "@/lib/validation";
import { uniquePackageSlug } from "@/lib/cms/slug";
import { logAudit } from "@/lib/audit";

/** Vendor's own package/tour submissions (any moderation status). */
export const GET = handler(async () => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const items = await prisma.tourPackage.findMany({
    where: { submittedByAgentId: session.agentId },
    orderBy: { updatedAt: "desc" },
    include: { destination: { select: { name: true } } },
  });
  return ok(items);
});

/** Vendor creates a new package/tour submission — always starts as an
 *  unpublished DRAFT; publishing requires admin approval (enforced server-side
 *  in the admin update route). */
export const POST = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  if (!(await getFlags()).packageMarketplaceEnabled) return fail("Content submissions are not available yet.", 403);

  const d = vendorPackageSubmissionSchema.parse(await req.json());
  const slug = await uniquePackageSlug(d.title);

  const created = await prisma.tourPackage.create({
    data: {
      kind: d.kind,
      title: d.title,
      slug,
      destinationId: d.destinationId || null,
      shortDescription: d.shortDescription || null,
      longDescription: d.longDescription || null,
      durationDays: d.durationDays ?? null,
      durationNights: d.durationNights ?? null,
      tripType: d.tripType || null,
      heroImage: d.heroImage || null,
      published: false,
      submittedByAgentId: session.agentId,
      moderationStatus: "DRAFT",
    },
    select: { id: true },
  });
  await logAudit({ actorType: "AGENT", actorId: session.agentId, actorLabel: session.name, action: "package.submit_draft", entityType: "cms", entityId: created.id });
  return ok(created);
});
