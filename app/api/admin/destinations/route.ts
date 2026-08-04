import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { destinationSchema } from "@/lib/validation";
import { uniqueDestinationSlug } from "@/lib/cms/slug";
import { revalidateDestinations } from "@/lib/cache/revalidate";

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const d = destinationSchema.parse(await req.json());
  const slug = await uniqueDestinationSlug(d.slug || d.name);

  const created = await prisma.destination.create({
    data: {
      name: d.name,
      slug,
      shortDescription: d.shortDescription || null,
      longDescription: d.longDescription || null,
      heroImage: d.heroImage || null,
      gallery: JSON.stringify(d.gallery ?? []),
      startingPrice: d.startingPrice ?? null,
      bestTime: d.bestTime || null,
      tripTypes: JSON.stringify(d.tripTypes ?? []),
      highlights: JSON.stringify(d.highlights ?? []),
      faqs: JSON.stringify(d.faqs ?? []),
      seoTitle: d.seoTitle || null,
      seoDescription: d.seoDescription || null,
      category: d.category || null,
      noindex: d.noindex,
      published: d.published,
      featured: d.featured,
      sortOrder: d.sortOrder,
    },
    select: { id: true, slug: true },
  });
  if (created.slug && d.published) revalidateDestinations(created.slug);
  else revalidateDestinations();
  return ok(created);
});
