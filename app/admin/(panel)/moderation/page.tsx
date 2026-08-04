import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { Card, Badge, EmptyState } from "@/components/ui";
import { ModerationActions } from "@/components/admin/ModerationActions";
import { formatDateTime, titleCase } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-500/20",
  PENDING_REVIEW: "bg-amber-50 text-amber-700 ring-amber-600/20",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filterStatus = status && status !== "ALL" ? status : "PENDING_REVIEW";
  const where = filterStatus === "ALL" ? { submittedByAgentId: { not: null } } : { submittedByAgentId: { not: null }, moderationStatus: filterStatus };

  const [destinations, packages] = await Promise.all([
    prisma.destination.findMany({ where: where as never, orderBy: { updatedAt: "desc" }, include: { submittedByAgent: { select: { companyName: true } } } }),
    prisma.tourPackage.findMany({ where: where as never, orderBy: { updatedAt: "desc" }, include: { submittedByAgent: { select: { companyName: true } } } }),
  ]);

  const items = [
    ...destinations.map((d) => ({ type: "destination" as const, id: d.id, title: d.name, editHref: `/admin/destinations/${d.id}/edit`, vendor: d.submittedByAgent?.companyName ?? "—", status: d.moderationStatus, reason: d.rejectionReason, updatedAt: d.updatedAt })),
    ...packages.map((p) => ({ type: "package" as const, id: p.id, title: p.title, editHref: `/admin/packages/${p.id}/edit`, vendor: p.submittedByAgent?.companyName ?? "—", status: p.moderationStatus, reason: p.rejectionReason, updatedAt: p.updatedAt })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const tabs = ["PENDING_REVIEW", "APPROVED", "REJECTED", "ALL"];

  return (
    <div>
      <PageHeader title="Content Moderation" subtitle="Review destinations and packages submitted by vendors." />

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-navy-100/60 p-1">
        {tabs.map((t) => (
          <Link
            key={t}
            href={`/admin/moderation?status=${t}`}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filterStatus === t || (t === "ALL" && filterStatus === "ALL") ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-800"}`}
          >
            {titleCase(t)}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nothing here" description="No vendor submissions match this filter." />
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Card key={`${it.type}-${it.id}`} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-navy-100 text-navy-700 ring-navy-500/20">{titleCase(it.type)}</Badge>
                    <Badge className={STATUS_STYLE[it.status] ?? ""}>{titleCase(it.status)}</Badge>
                  </div>
                  <h3 className="mt-2 font-semibold text-navy-900">{it.title}</h3>
                  <p className="text-sm text-navy-500">Submitted by {it.vendor} · {formatDateTime(it.updatedAt)}</p>
                  {it.reason && <p className="mt-1 text-sm text-rose-600">Rejected: {it.reason}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={it.editHref} className="rounded-lg border border-navy-200 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50">Edit</Link>
                  {it.status === "PENDING_REVIEW" && <ModerationActions type={it.type} id={it.id} />}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
