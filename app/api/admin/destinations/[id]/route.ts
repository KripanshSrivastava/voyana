import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { destinationSchema } from "@/lib/validation";
import { uniqueDestinationSlug } from "@/lib/cms/slug";
import { revalidateDestinations } from "@/lib/cache/revalidate";
import { assertPublishAllowed } from "@/lib/cms/moderation";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const body = await req.json();

  // Lightweight toggle (publish/feature) without full validation.
  if (body.__toggle) {
    const data: Record<string, boolean> = {};
    if (typeof body.published === "boolean") data.published = body.published;
    if (typeof body.featured === "boolean") data.featured = body.featured;
    if (data.published) {
      const current = await prisma.destination.findUnique({ where: { id }, select: { moderationStatus: true } });
      if (current) assertPublishAllowed(current.moderationStatus, true);
    }
    const updated = await prisma.destination.update({ where: { id }, data, select: { slug: true } });
    revalidateDestinations(updated.slug);
    return ok({ id });
  }

  const d = destinationSchema.parse(body);
  const existing = await prisma.destination.findUnique({ where: { id } });
  if (!existing) return fail("Destination not found.", 404);
  assertPublishAllowed(existing.moderationStatus, d.published);
  const slug = await uniqueDestinationSlug(d.slug || d.name, id);

  await prisma.destination.update({
    where: { id },
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
  });
  // Revalidate both the new and previous slug (a slug change would otherwise
  // leave the old detail path serving stale cached content).
  revalidateDestinations(slug);
  if (existing.slug !== slug) revalidateDestinations(existing.slug);
  return ok({ id, slug });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const pkgCount = await prisma.tourPackage.count({ where: { destinationId: id } });
  const existing = await prisma.destination.findUnique({ where: { id }, select: { slug: true } });
  // Packages are detached (destinationId set null via SetNull) — historical leads keep snapshots.
  await prisma.destination.delete({ where: { id } });
  revalidateDestinations(existing?.slug);
  return ok({ id, detachedPackages: pkgCount });
});
