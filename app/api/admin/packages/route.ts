import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { packageSchema } from "@/lib/validation";
import { uniquePackageSlug } from "@/lib/cms/slug";
import { packageScalars, packageChildren } from "@/lib/cms/packageWrite";
import { revalidatePackages } from "@/lib/cache/revalidate";

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const d = packageSchema.parse(await req.json());
  const slug = await uniquePackageSlug(d.slug || d.title);
  const children = packageChildren(d);

  const created = await prisma.tourPackage.create({
    data: {
      ...packageScalars(d),
      slug,
      images: { create: children.images },
      itinerary: { create: children.itinerary },
      inclusions: { create: children.inclusions },
      exclusions: { create: children.exclusions },
      faqs: { create: children.faqs },
    },
    select: { id: true, slug: true, kind: true },
  });
  revalidatePackages(created.slug, created.kind as "PACKAGE" | "TOUR");
  return ok(created);
});
