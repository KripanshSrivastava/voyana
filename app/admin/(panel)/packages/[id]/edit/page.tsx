import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { PackageEditor } from "@/components/admin/PackageEditor";
import { packageToForm, packageInclude } from "@/lib/cms/packageForm";

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, destinations] = await Promise.all([
    prisma.tourPackage.findUnique({ where: { id }, include: packageInclude }),
    prisma.destination.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!p) notFound();
  return (
    <div>
      <PageHeader title={`Edit: ${p.title}`} subtitle={`/packages/${p.slug}`} />
      <PackageEditor id={p.id} kind="PACKAGE" destinations={destinations} initial={packageToForm(p)} />
    </div>
  );
}
