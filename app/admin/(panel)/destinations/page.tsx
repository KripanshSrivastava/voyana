import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ContentRowActions } from "@/components/admin/ContentRowActions";
import { Badge, EmptyState, ButtonLink } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function AdminDestinationsPage() {
  const destinations = await prisma.destination.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: { _count: { select: { packages: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Destinations"
        subtitle="Manage destination content shown on the public site."
        action={<ButtonLink href="/admin/destinations/new" variant="brand"><Plus className="h-4 w-4" /> Add destination</ButtonLink>}
      />
      {destinations.length === 0 ? (
        <EmptyState title="No destinations yet" description="Create your first destination to start building the public catalog." action={<ButtonLink href="/admin/destinations/new" variant="brand">Add destination</ButtonLink>} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-navy-50/60">
                <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="px-4 py-3 font-medium">Destination</th>
                  <th className="px-4 py-3 font-medium">Packages</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Featured</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {destinations.map((d) => (
                  <tr key={d.id} className="hover:bg-navy-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {d.heroImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.heroImage} alt="" className="h-10 w-14 rounded-lg object-cover" />
                        ) : (
                          <div className="h-10 w-14 rounded-lg bg-navy-100" />
                        )}
                        <div>
                          <div className="font-medium text-navy-800">{d.name}</div>
                          <div className="text-xs text-navy-400">/{d.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy-700">{d._count.packages}</td>
                    <td className="px-4 py-3">
                      <Badge className={d.published ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-navy-100 text-navy-600 ring-navy-500/20"}>
                        {d.published ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{d.featured ? <Badge className="bg-sun-500/10 text-sun-600 ring-sun-500/20">Featured</Badge> : <span className="text-navy-300">—</span>}</td>
                    <td className="px-4 py-3 text-navy-500">{formatDate(d.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <ContentRowActions resource="destinations" id={d.id} published={d.published} editHref={`/admin/destinations/${d.id}/edit`} previewHref={`/admin/preview/destination/${d.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
