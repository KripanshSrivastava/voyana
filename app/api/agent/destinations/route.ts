import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getFlags } from "@/lib/flags";
import { vendorDestinationSubmissionSchema } from "@/lib/validation";
import { uniqueDestinationSlug } from "@/lib/cms/slug";
import { logAudit } from "@/lib/audit";

/** Vendor's own destination submissions (any moderation status). */
export const GET = handler(async () => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const items = await prisma.destination.findMany({
    where: { submittedByAgentId: session.agentId },
    orderBy: { updatedAt: "desc" },
  });
  return ok(items);
});

/** Vendor creates a new destination submission — always starts as an unpublished
 *  DRAFT. It can never become visible publicly until an admin approves AND
 *  publishes it (enforced server-side in the admin update route). */
export const POST = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  if (!(await getFlags()).packageMarketplaceEnabled) return fail("Content submissions are not available yet.", 403);

  const d = vendorDestinationSubmissionSchema.parse(await req.json());
  const slug = await uniqueDestinationSlug(d.name);

  const created = await prisma.destination.create({
    data: {
      name: d.name,
      slug,
      shortDescription: d.shortDescription || null,
      longDescription: d.longDescription || null,
      bestTime: d.bestTime || null,
      tripTypes: JSON.stringify(d.tripTypes ?? []),
      highlights: JSON.stringify(d.highlights ?? []),
      heroImage: d.heroImage || null,
      published: false,
      submittedByAgentId: session.agentId,
      moderationStatus: "DRAFT",
    },
    select: { id: true },
  });
  await logAudit({ actorType: "AGENT", actorId: session.agentId, actorLabel: session.name, action: "destination.submit_draft", entityType: "cms", entityId: created.id });
  return ok(created);
});
