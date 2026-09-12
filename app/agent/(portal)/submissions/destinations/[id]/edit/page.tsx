import { notFound } from "next/navigation";
import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { VendorDestinationEditor } from "@/components/agent/VendorDestinationEditor";
import type { DestinationFormValue } from "@/components/admin/DestinationEditor";
import { parseJson } from "@/lib/utils";

const EDITABLE_STATUSES = ["DRAFT", "REJECTED"];

export default async function EditVendorDestinationPage({ params }: { params: Promise<{ id: string }> }) {
  const { agent } = await requireAgent();
  const { id } = await params;

  const d = await prisma.destination.findUnique({ where: { id } });
  if (!d || d.submittedByAgentId !== agent.id) notFound();

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
    category: d.category ?? "",
    noindex: d.noindex,
    published: d.published,
    featured: d.featured,
    sortOrder: d.sortOrder.toString(),
  };

  return (
    <div>
      <PageHeader
        title={`Edit: ${d.name}`}
        subtitle={
          EDITABLE_STATUSES.includes(d.moderationStatus)
            ? "An admin reviews this before it goes live."
            : "This submission is under review or already approved — changes here won't apply until you contact an admin."
        }
      />
      <VendorDestinationEditor id={d.id} initial={initial} redirectTo="/agent/submissions" />
    </div>
  );
}
