import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { packageSchema } from "@/lib/validation";
import { uniquePackageSlug } from "@/lib/cms/slug";
import { packageScalars, packageChildren } from "@/lib/cms/packageWrite";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const body = await req.json();

  if (body.__toggle) {
    const data: Record<string, boolean> = {};
    if (typeof body.published === "boolean") data.published = body.published;
    if (typeof body.featured === "boolean") data.featured = body.featured;
    await prisma.tourPackage.update({ where: { id }, data });
    return ok({ id });
  }

  const d = packageSchema.parse(body);
  const existing = await prisma.tourPackage.findUnique({ where: { id } });
  if (!existing) return fail("Not found.", 404);
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
  return ok({ id, slug });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  // Leads referencing this package keep their snapshot (packageId set null via SetNull).
  await prisma.tourPackage.delete({ where: { id } });
  return ok({ id });
});
