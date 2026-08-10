import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "../db";
import { cached } from "../cache/publicCache";

// Public content queries — only ever return published records.
// Only read-only, publicly-visible listings are cached here (short TTL,
// invalidated on admin writes via lib/cache/revalidate.ts). Never cache
// anything wallet/lead/payment/authorization related.
//
// Two-tier caching:
//   1. Next.js `unstable_cache` — participates in prerender/ISR, so pages
//      with `export const revalidate` become static instead of dynamic.
//      The raw Upstash REST fetch (no-store) used to bail every page to
//      dynamic on build; wrapping it here fixes that.
//   2. `cached()` (Upstash Redis) — cross-instance tier that survives cold
//      serverless starts and keeps everyone in sync without Next's per-
//      instance data cache.
// Admin mutations call revalidatePath() + tag invalidation from
// lib/cache/revalidate.ts to flush both layers.
const LIST_TTL_SECONDS = 120;

const DESTINATION_TAG = "cms:destinations";
const PACKAGE_TAG = "cms:packages";
const VENDOR_TAG = "cms:vendors";
const VENDOR_AD_TAG = "cms:vendor-ads";

export function getPublishedDestinations(opts?: { featuredFirst?: boolean; take?: number }) {
  return prisma.destination.findMany({
    where: { published: true },
    orderBy: opts?.featuredFirst
      ? [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }]
      : [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: opts?.take,
    include: { _count: { select: { packages: { where: { published: true } } } } },
  });
}

export function getFeaturedDestinations(take = 6) {
  return unstable_cache(
    () =>
      cached(`featured-destinations:${take}`, LIST_TTL_SECONDS, () =>
        prisma.destination.findMany({
          where: { published: true, featured: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          take,
          include: { _count: { select: { packages: { where: { published: true } } } } },
        })
      ),
    [`featured-destinations`, String(take)],
    { revalidate: LIST_TTL_SECONDS, tags: [DESTINATION_TAG] },
  )();
}

// React `cache()` dedupes the call within a single render pass so
// generateMetadata + the page body share one DB hit instead of two.
export const getDestinationBySlug = cache((slug: string) =>
  prisma.destination.findFirst({
    where: { slug, published: true },
    include: {
      packages: {
        where: { published: true },
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
        include: { images: { orderBy: { sortOrder: "asc" } } },
      },
    },
  })
);

export function getPublishedPackages(opts?: {
  kind?: "PACKAGE" | "TOUR";
  featuredOnly?: boolean;
  take?: number;
  destinationId?: string;
}) {
  return prisma.tourPackage.findMany({
    where: {
      published: true,
      ...(opts?.kind ? { kind: opts.kind } : {}),
      ...(opts?.featuredOnly ? { featured: true } : {}),
      ...(opts?.destinationId ? { destinationId: opts.destinationId } : {}),
    },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    take: opts?.take,
    include: {
      destination: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export function getFeaturedPackages(kind: "PACKAGE" | "TOUR", take = 6) {
  return unstable_cache(
    () =>
      cached(`featured-packages:${kind}:${take}`, LIST_TTL_SECONDS, () =>
        getPublishedPackages({ kind, featuredOnly: true, take })
      ),
    [`featured-packages`, kind, String(take)],
    { revalidate: LIST_TTL_SECONDS, tags: [PACKAGE_TAG] },
  )();
}

/** Public "verified partners" showcase — only APPROVED + VERIFIED agents,
 *  and only public-safe fields (no phone/email/PII). */
export function getPublicVendors(take = 6) {
  return unstable_cache(
    () =>
      cached(`public-vendors:${take}`, LIST_TTL_SECONDS, () =>
        prisma.agent.findMany({
          where: { status: "APPROVED", verificationStatus: "VERIFIED" },
          orderBy: { verifiedAt: "desc" },
          take,
          select: {
            id: true,
            companyName: true,
            city: true,
            state: true,
            website: true,
            socials: true,
            profileImage: true,
          },
        })
      ),
    [`public-vendors`, String(take)],
    { revalidate: LIST_TTL_SECONDS, tags: [VENDOR_TAG] },
  )();
}

/** Public vendor ad slots — approved, and within their scheduled date window
 *  (or no dates set). Caller must additionally check the vendorAdsEnabled
 *  feature flag before showing these; that's a site-wide toggle, not a filter
 *  on individual ads, so it stays out of this query. */
export function getPublicVendorAds(take = 6) {
  return unstable_cache(
    () =>
      cached(`public-vendor-ads:${take}`, LIST_TTL_SECONDS, async () => {
        const now = new Date();
        return prisma.vendorAd.findMany({
          where: {
            status: "APPROVED",
            AND: [
              { OR: [{ startDate: null }, { startDate: { lte: now } }] },
              { OR: [{ endDate: null }, { endDate: { gte: now } }] },
            ],
          },
          // No bidding on the new ad model — cost per click is a flat admin-set
          // rate. Newest approved ads surface first.
          orderBy: [{ createdAt: "desc" }],
          take,
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            landingUrl: true,
            destination: true,
            agent: { select: { companyName: true } },
          },
        });
      }),
    [`public-vendor-ads`, String(take)],
    { revalidate: LIST_TTL_SECONDS, tags: [VENDOR_AD_TAG] },
  )();
}

/** Cache-tag map for `revalidate.ts` to flush Next's data cache after admin edits. */
export const CMS_TAGS = {
  destinations: DESTINATION_TAG,
  packages: PACKAGE_TAG,
  vendors: VENDOR_TAG,
  vendorAds: VENDOR_AD_TAG,
} as const;

export const getPackageBySlug = cache((slug: string, kind?: "PACKAGE" | "TOUR") =>
  prisma.tourPackage.findFirst({
    where: { slug, published: true, ...(kind ? { kind } : {}) },
    include: {
      destination: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      itinerary: { orderBy: [{ day: "asc" }, { sortOrder: "asc" }] },
      inclusions: { orderBy: { sortOrder: "asc" } },
      exclusions: { orderBy: { sortOrder: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  })
);
