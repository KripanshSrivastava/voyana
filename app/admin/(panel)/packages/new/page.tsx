import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { PackageEditor } from "@/components/admin/PackageEditor";

export default async function NewPackagePage() {
  const destinations = await prisma.destination.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div>
      <PageHeader title="New package" subtitle="Create a package for the public catalog." />
      <PackageEditor kind="PACKAGE" destinations={destinations} />
    </div>
  );
}
