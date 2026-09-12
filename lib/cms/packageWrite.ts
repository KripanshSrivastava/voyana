import type { z } from "zod";
import type { packageSchema } from "../validation";

type PackageInput = z.infer<typeof packageSchema>;

/** Scalar column data for a TourPackage row from validated input. `slug` is
 * handled separately by the caller (uniquePackageSlug) — omitted here so
 * vendor submissions (which never set their own slug) can reuse this too. */
export function packageScalars(d: Omit<PackageInput, "slug">) {
  const gallery = d.gallery ?? [];
  return {
    kind: d.kind,
    title: d.title,
    destinationId: d.destinationId || null,
    shortDescription: d.shortDescription || null,
    longDescription: d.longDescription || null,
    heroImage: d.heroImage || gallery[0] || null,
    durationDays: d.durationDays ?? null,
    durationNights: d.durationNights ?? null,
    durationText:
      d.durationDays != null
        ? `${d.durationDays}D${d.durationNights != null ? ` / ${d.durationNights}N` : ""}`
        : null,
    startingPrice: d.startingPrice ?? null,
    offerPrice: d.offerPrice ?? null,
    priceLabel: d.priceLabel || null,
    hotelCategory: d.hotelCategory || null,
    accommodation: d.accommodation || null,
    transport: d.transport || null,
    activities: JSON.stringify(d.activities ?? []),
    tripType: d.tripType || null,
    difficulty: d.difficulty || null,
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
    noindex: d.noindex,
    published: d.published,
    featured: d.featured,
    sortOrder: d.sortOrder,
  };
}

/** Nested create payloads for child relations. Only needs the child-list
 * fields — accepts vendor submissions too, which don't carry the admin-only
 * scalar fields (slug/published/featured/sortOrder/noindex). */
export function packageChildren(
  d: Pick<PackageInput, "gallery" | "itinerary" | "inclusions" | "exclusions" | "faqs">,
) {
  const gallery = d.gallery ?? [];
  return {
    images: gallery.map((url, i) => ({ url, isHero: i === 0, sortOrder: i })),
    itinerary: (d.itinerary ?? []).map((it, i) => ({
      day: it.day || i + 1,
      title: it.title,
      description: it.description || null,
      sortOrder: i,
    })),
    inclusions: (d.inclusions ?? []).map((text, i) => ({ text, sortOrder: i })),
    exclusions: (d.exclusions ?? []).map((text, i) => ({ text, sortOrder: i })),
    faqs: (d.faqs ?? []).map((f, i) => ({ question: f.question, answer: f.answer, sortOrder: i })),
  };
}
