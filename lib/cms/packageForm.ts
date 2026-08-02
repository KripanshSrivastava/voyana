import type { Prisma } from "@prisma/client";
import type { PackageFormValue } from "@/components/admin/PackageEditor";
import { parseJson } from "../utils";

type FullPackage = Prisma.TourPackageGetPayload<{
  include: { images: true; itinerary: true; inclusions: true; exclusions: true; faqs: true };
}>;

export function packageToForm(p: FullPackage): PackageFormValue {
  return {
    kind: p.kind === "TOUR" ? "TOUR" : "PACKAGE",
    title: p.title,
    slug: p.slug,
    destinationId: p.destinationId ?? "",
    shortDescription: p.shortDescription ?? "",
    longDescription: p.longDescription ?? "",
    heroImage: p.heroImage ?? "",
    gallery: p.images.sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.url),
    durationDays: p.durationDays?.toString() ?? "",
    durationNights: p.durationNights?.toString() ?? "",
    startingPrice: p.startingPrice?.toString() ?? "",
    offerPrice: p.offerPrice?.toString() ?? "",
    priceLabel: p.priceLabel ?? "",
    hotelCategory: p.hotelCategory ?? "",
    accommodation: p.accommodation ?? "",
    transport: p.transport ?? "",
    activities: parseJson<string[]>(p.activities, []),
    tripType: p.tripType ?? "",
    difficulty: p.difficulty ?? "",
    itinerary: p.itinerary
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((it) => ({ day: it.day, title: it.title, description: it.description ?? "" })),
    inclusions: p.inclusions.sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.text),
    exclusions: p.exclusions.sort((a, b) => a.sortOrder - b.sortOrder).map((e) => e.text),
    faqs: p.faqs.sort((a, b) => a.sortOrder - b.sortOrder).map((f) => ({ question: f.question, answer: f.answer })),
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    noindex: p.noindex,
    published: p.published,
    featured: p.featured,
    sortOrder: p.sortOrder.toString(),
  };
}

export const packageInclude = {
  images: true, itinerary: true, inclusions: true, exclusions: true, faqs: true,
} as const;
