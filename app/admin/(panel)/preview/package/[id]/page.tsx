import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PackageDetail } from "@/components/site/PackageDetail";

export const metadata = { title: "Preview", robots: { index: false } };

export default async function PackagePreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.tourPackage.findUnique({
    where: { id },
    include: {
      destination: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      itinerary: { orderBy: [{ day: "asc" }, { sortOrder: "asc" }] },
      inclusions: { orderBy: { sortOrder: "asc" } },
      exclusions: { orderBy: { sortOrder: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p) notFound();
  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      <div className="bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800">
        Preview mode — {p.published ? "published" : "draft (not visible to the public)"}
      </div>
      <PackageDetail p={p} basePath={p.kind === "TOUR" ? "/tours" : "/packages"} />
    </div>
  );
}
