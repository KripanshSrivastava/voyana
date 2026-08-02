import { prisma } from "../db";

// Public content queries — only ever return published records.

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
  return prisma.destination.findMany({
    where: { published: true, featured: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take,
    include: { _count: { select: { packages: { where: { published: true } } } } },
  });
}

export async function getDestinationBySlug(slug: string) {
  return prisma.destination.findFirst({
    where: { slug, published: true },
    include: {
      packages: {
        where: { published: true },
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
        include: { images: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
}

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
  return getPublishedPackages({ kind, featuredOnly: true, take });
}

export async function getPackageBySlug(slug: string, kind?: "PACKAGE" | "TOUR") {
  return prisma.tourPackage.findFirst({
    where: { slug, published: true, ...(kind ? { kind } : {}) },
    include: {
      destination: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      itinerary: { orderBy: [{ day: "asc" }, { sortOrder: "asc" }] },
      inclusions: { orderBy: { sortOrder: "asc" } },
      exclusions: { orderBy: { sortOrder: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  });
}
