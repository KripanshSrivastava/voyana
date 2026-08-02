import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { DestinationEditor, type DestinationFormValue } from "@/components/admin/DestinationEditor";
import { parseJson } from "@/lib/utils";

export default async function EditDestinationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await prisma.destination.findUnique({ where: { id } });
  if (!d) notFound();

  const initial: DestinationFormValue = {
    name: d.name,
    slug: d.slug,
    shortDescription: d.shortDescription ?? "",
    longDescription: d.longDescription ?? "",
    heroImage: d.heroImage ?? "",
    gallery: parseJson<string[]>(d.gallery, []),
    startingPrice: d.startingPrice?.toString() ?? "",
    bestTime: d.bestTime ?? "",
    tripTypes: parseJson<string[]>(d.tripTypes, []),
    highlights: parseJson<string[]>(d.highlights, []),
    faqs: parseJson<{ question: string; answer: string }[]>(d.faqs, []),
    seoTitle: d.seoTitle ?? "",
    seoDescription: d.seoDescription ?? "",
    noindex: d.noindex,
    published: d.published,
    featured: d.featured,
    sortOrder: d.sortOrder.toString(),
  };

  return (
    <div>
      <PageHeader title={`Edit: ${d.name}`} subtitle={`/destinations/${d.slug}`} />
      <DestinationEditor id={d.id} initial={initial} />
    </div>
  );
}
