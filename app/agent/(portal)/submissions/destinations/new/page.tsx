import { notFound } from "next/navigation";
import { requireAgent } from "@/lib/guards";
import { getFlags } from "@/lib/flags";
import { PageHeader } from "@/components/admin/ui";
import { VendorDestinationEditor } from "@/components/agent/VendorDestinationEditor";

export default async function NewVendorDestinationPage() {
  await requireAgent();
  const flags = await getFlags();
  if (!flags.packageMarketplaceEnabled) notFound();

  return (
    <div>
      <PageHeader
        title="New destination"
        subtitle="Fill in as much as you like — an admin reviews it before it goes live."
      />
      <VendorDestinationEditor redirectTo="/agent/submissions" />
    </div>
  );
}
