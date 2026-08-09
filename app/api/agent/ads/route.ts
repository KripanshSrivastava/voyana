import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getFlags } from "@/lib/flags";

/**
 * Vendor creates an advertisement (DRAFT or PENDING).
 *
 * The vendor picks a target from their OWN approved CMS submissions
 * (Destination or TourPackage) — the ad's landing URL and destination
 * label are DERIVED FROM THAT TARGET on the server. Rejects any target
 * the vendor doesn't own or that isn't approved, so an ad can't be used
 * to smuggle traffic to arbitrary URLs.
 *
 * No rupees. Cost per click lives in SiteSetting.adCostPerClickCredits
 * and is enforced at click-tracking time (out of scope for this route).
 */
export const POST = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  if (!(await getFlags()).vendorAdsEnabled) return fail("Vendor advertising is not available yet.", 403);

  const b = await req.json();
  if (typeof b.title !== "string" || b.title.trim().length < 3) return fail("Enter an ad title.", 422);

  const targetType = typeof b.targetType === "string" ? b.targetType.toUpperCase() : "";
  const targetSubmissionId = typeof b.targetSubmissionId === "string" ? b.targetSubmissionId : "";
  if (!targetSubmissionId) return fail("Choose what you want to advertise.", 422);
  if (targetType !== "DESTINATION" && targetType !== "PACKAGE" && targetType !== "TOUR") {
    return fail("Unsupported ad target type.", 422);
  }

  // Look up the target and verify ownership + APPROVED status. This is the
  // authorisation gate — never trust the client's targetSubmissionId blindly.
  let derivedDestination: string | null = null;
  let derivedLandingUrl: string | null = null;
  let derivedImageUrl: string | null = null;

  if (targetType === "DESTINATION") {
    const dest = await prisma.destination.findUnique({
      where: { id: targetSubmissionId },
      select: { id: true, name: true, slug: true, heroImage: true, submittedByAgentId: true, moderationStatus: true },
    });
    if (!dest || dest.submittedByAgentId !== session.agentId) return fail("You can only advertise destinations you submitted.", 403);
    if (dest.moderationStatus !== "APPROVED") return fail("This destination isn't approved yet.", 409);
    derivedDestination = dest.name;
    derivedLandingUrl = `/destinations/${dest.slug}`;
    derivedImageUrl = dest.heroImage ?? null;
  } else {
    // PACKAGE and TOUR both live in TourPackage — the `kind` column distinguishes them.
    const pkg = await prisma.tourPackage.findUnique({
      where: { id: targetSubmissionId },
      select: { id: true, title: true, slug: true, heroImage: true, kind: true, submittedByAgentId: true, moderationStatus: true, destination: { select: { name: true } } },
    });
    if (!pkg || pkg.submittedByAgentId !== session.agentId) return fail("You can only advertise packages or tours you submitted.", 403);
    if (pkg.moderationStatus !== "APPROVED") return fail("This submission isn't approved yet.", 409);
    // Client's chosen type must match the record's kind — otherwise a vendor
    // could tag a TOUR as PACKAGE and vice versa.
    if (targetType === "PACKAGE" && pkg.kind !== "PACKAGE") return fail("That submission is a tour, not a package.", 422);
    if (targetType === "TOUR" && pkg.kind !== "TOUR") return fail("That submission is a package, not a tour.", 422);
    derivedDestination = pkg.destination?.name ?? pkg.title;
    derivedLandingUrl = `/packages/${pkg.slug}`;
    derivedImageUrl = pkg.heroImage ?? null;
  }

  const ad = await prisma.vendorAd.create({
    data: {
      agentId: session.agentId,
      title: b.title.trim().slice(0, 120),
      description: typeof b.description === "string" ? b.description.slice(0, 1000) : null,
      targetType,
      targetSubmissionId,
      destination: derivedDestination,
      landingUrl: derivedLandingUrl,
      imageUrl: derivedImageUrl,
      status: b.submit ? "PENDING" : "DRAFT",
    },
  });
  return ok({ id: ad.id, status: ad.status });
});
