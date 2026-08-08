import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getFlags } from "@/lib/flags";
import { PageHeader } from "@/components/admin/ui";
import { Card, Badge, EmptyState } from "@/components/ui";
import { SubmissionForm } from "@/components/agent/SubmissionForm";
import { SubmitForReviewButton } from "@/components/agent/SubmitForReviewButton";
import { formatDateTime, titleCase } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-500/20",
  PENDING_REVIEW: "bg-amber-50 text-amber-700 ring-amber-600/20",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export default async function AgentSubmissionsPage() {
  const { agent } = await requireAgent();
  const flags = await getFlags();
  if (!flags.packageMarketplaceEnabled) {
    return (
      <div>
        <PageHeader title="Add Your Package, Destination or Tour" subtitle="Create a package, destination experience, or tour to showcase to travelers." />
        <Card className="p-6 text-sm text-navy-500">Content submissions aren&apos;t available yet. The Moksh Booking team will enable it soon.</Card>
      </div>
    );
  }

  const [destinations, packages, availableDestinations] = await Promise.all([
    prisma.destination.findMany({ where: { submittedByAgentId: agent.id }, orderBy: { updatedAt: "desc" } }),
    prisma.tourPackage.findMany({ where: { submittedByAgentId: agent.id }, orderBy: { updatedAt: "desc" }, include: { destination: { select: { name: true } } } }),
    prisma.destination.findMany({ where: { published: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const items = [
    ...destinations.map((d) => ({ type: "destination" as const, id: d.id, title: d.name, status: d.moderationStatus, reason: d.rejectionReason, updatedAt: d.updatedAt })),
    ...packages.map((p) => ({ type: "package" as const, id: p.id, title: p.title, status: p.moderationStatus, reason: p.rejectionReason, updatedAt: p.updatedAt })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Add Your Package, Destination or Tour" subtitle="Create a package, destination experience, or tour to showcase to travelers. An admin reviews before anything goes live." />
      <SubmissionForm destinations={availableDestinations} />
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-navy-900">Your submissions</h2>
        {items.length === 0 ? (
          <EmptyState title="No submissions yet" description="Use the form above to propose new content." />
        ) : (
          <div className="divide-y divide-navy-50">
            {items.map((it) => (
              <div key={`${it.type}-${it.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-navy-100 text-navy-700 ring-navy-500/20">{titleCase(it.type)}</Badge>
                    <Badge className={STATUS_STYLE[it.status] ?? ""}>{titleCase(it.status)}</Badge>
                  </div>
                  <div className="mt-1 font-medium text-navy-800">{it.title}</div>
                  <div className="text-xs text-navy-400">{formatDateTime(it.updatedAt)}</div>
                  {it.reason && <p className="mt-1 text-sm text-rose-600">Rejected: {it.reason}</p>}
                </div>
                {(it.status === "DRAFT" || it.status === "REJECTED") && <SubmitForReviewButton type={it.type} id={it.id} />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
