import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { canAccess } from "@/lib/rbac";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { PageHeader } from "@/components/admin/ui";
import { PackageTableView } from "@/components/admin/PackageTableView";
import { EmptyState, ButtonLink } from "@/components/ui";
import { Plus } from "lucide-react";

export default async function AdminToursPage() {
  const session = await requireAdmin();
  if (!canAccess(session, "content")) return <AccessRestricted area="Tours" />;
  const rows = await prisma.tourPackage.findMany({
    where: { kind: "TOUR" },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: { destination: { select: { name: true } } },
  });
  return (
    <div>
      <PageHeader title="Tours" subtitle="Guided tours and experiences shown on the public site." action={<ButtonLink href="/admin/tours/new" variant="brand"><Plus className="h-4 w-4" /> Add tour</ButtonLink>} />
      {rows.length === 0 ? (
        <EmptyState title="No tours yet" description="Create your first tour to display it publicly." action={<ButtonLink href="/admin/tours/new" variant="brand">Create tour</ButtonLink>} />
      ) : (
        <PackageTableView rows={rows} basePath="tours" />
      )}
    </div>
  );
}
