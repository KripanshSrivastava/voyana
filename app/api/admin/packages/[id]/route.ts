import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { packageSchema } from "@/lib/validation";
import { uniquePackageSlug } from "@/lib/cms/slug";
import { packageScalars, packageChildren } from "@/lib/cms/packageWrite";
import { revalidatePackages } from "@/lib/cache/revalidate";
import { assertPublishAllowed } from "@/lib/cms/moderation";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const body = await req.json();

  if (body.__toggle) {
    const data: Record<string, boolean> = {};
    if (typeof body.published === "boolean") data.published = body.published;
    if (typeof body.featured === "boolean") data.featured = body.featured;
    if (data.published) {
      const current = await prisma.tourPackage.findUnique({ where: { id }, select: { moderationStatus: true } });
      if (current) assertPublishAllowed(current.moderationStatus, true);
    }
    const updated = await prisma.tourPackage.update({ where: { id }, data, select: { slug: true, kind: true } });
    revalidatePackages(updated.slug, updated.kind as "PACKAGE" | "TOUR");
    return ok({ id });
  }

  const d = packageSchema.parse(body);
  const existing = await prisma.tourPackage.findUnique({ where: { id } });
  if (!existing) return fail("Not found.", 404);
  assertPublishAllowed(existing.moderationStatus, d.published);
  const slug = await uniquePackageSlug(d.slug || d.title, id);
  const children = packageChildren(d);

  // Replace children wholesale inside a transaction.
  await prisma.$transaction([
    prisma.packageImage.deleteMany({ where: { packageId: id } }),
    prisma.packageItinerary.deleteMany({ where: { packageId: id } }),
    prisma.packageInclusion.deleteMany({ where: { packageId: id } }),
    prisma.packageExclusion.deleteMany({ where: { packageId: id } }),
    prisma.packageFAQ.deleteMany({ where: { packageId: id } }),
    prisma.tourPackage.update({
      where: { id },
      data: {
        ...packageScalars(d),
        slug,
        images: { create: children.images },
        itinerary: { create: children.itinerary },
        inclusions: { create: children.inclusions },
        exclusions: { create: children.exclusions },
        faqs: { create: children.faqs },
      },
    }),
  ]);
  revalidatePackages(slug, d.kind);
  if (existing.slug !== slug) revalidatePackages(existing.slug, existing.kind as "PACKAGE" | "TOUR");
  return ok({ id, slug });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const existing = await prisma.tourPackage.findUnique({ where: { id }, select: { slug: true, kind: true } });
  // Leads referencing this package keep their snapshot (packageId set null via SetNull).
  await prisma.tourPackage.delete({ where: { id } });
  revalidatePackages(existing?.slug, existing?.kind as "PACKAGE" | "TOUR" | undefined);
  return ok({ id });
});
