import { notFound } from "next/navigation";
import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { VendorPackageEditor } from "@/components/agent/VendorPackageEditor";
import { packageToForm, packageInclude } from "@/lib/cms/packageForm";

const EDITABLE_STATUSES = ["DRAFT", "REJECTED"];

export default async function EditVendorPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { agent } = await requireAgent();
  const { id } = await params;

  const [p, destinations] = await Promise.all([
    prisma.tourPackage.findUnique({ where: { id }, include: packageInclude }),
    prisma.destination.findMany({ where: { published: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!p || p.submittedByAgentId !== agent.id) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit: ${p.title}`}
        subtitle={
          EDITABLE_STATUSES.includes(p.moderationStatus)
            ? "An admin reviews this before it goes live."
            : "This submission is under review or already approved — changes here won't apply until you contact an admin."
        }
      />
      <VendorPackageEditor
        id={p.id}
        kind={p.kind === "TOUR" ? "TOUR" : "PACKAGE"}
        destinations={destinations}
        initial={packageToForm(p)}
        redirectTo="/agent/submissions"
      />
    </div>
  );
}
