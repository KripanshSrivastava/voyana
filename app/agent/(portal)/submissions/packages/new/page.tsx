import { requireAgent } from "@/lib/guards";
import { getFlags } from "@/lib/flags";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { VendorPackageEditor } from "@/components/agent/VendorPackageEditor";

export default async function NewVendorPackagePage() {
  await requireAgent();
  const flags = await getFlags();
  if (!flags.packageMarketplaceEnabled) notFound();

  const destinations = await prisma.destination.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <PageHeader
        title="New package or tour"
        subtitle="Fill in as much as you like — an admin reviews it before it goes live."
      />
      <VendorPackageEditor kind="PACKAGE" destinations={destinations} redirectTo="/agent/submissions" />
    </div>
  );
}
