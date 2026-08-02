import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { PackageEditor } from "@/components/admin/PackageEditor";

export default async function NewTourPage() {
  const destinations = await prisma.destination.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div>
      <PageHeader title="New tour" subtitle="Create a guided tour for the public catalog." />
      <PackageEditor kind="TOUR" destinations={destinations} />
    </div>
  );
}
