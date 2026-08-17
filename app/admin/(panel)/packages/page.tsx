import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { canAccess } from "@/lib/rbac";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { PageHeader } from "@/components/admin/ui";
import { PackageTableView } from "@/components/admin/PackageTableView";
import { EmptyState, ButtonLink } from "@/components/ui";
import { Plus } from "lucide-react";

export default async function AdminPackagesPage() {
  const session = await requireAdmin();
  if (!canAccess(session, "content")) return <AccessRestricted area="Packages" />;
  const rows = await prisma.tourPackage.findMany({
    where: { kind: "PACKAGE" },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: { destination: { select: { name: true } } },
  });
  return (
    <div>
      <PageHeader title="Packages" subtitle="Sellable travel packages shown on the public site." action={<ButtonLink href="/admin/packages/new" variant="brand"><Plus className="h-4 w-4" /> Add package</ButtonLink>} />
      {rows.length === 0 ? (
        <EmptyState title="No packages published yet" description="Create your first package to display it on the public catalog." action={<ButtonLink href="/admin/packages/new" variant="brand">Create package</ButtonLink>} />
      ) : (
        <PackageTableView rows={rows} basePath="packages" />
      )}
    </div>
  );
}
