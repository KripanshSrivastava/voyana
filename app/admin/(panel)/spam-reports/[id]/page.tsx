import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { requireArea } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/ui";
import { Card, Badge } from "@/components/ui";
import { formatDateTime, formatINR, formatDate, titleCase } from "@/lib/utils";
import { SpamReportActions } from "@/components/admin/SpamReportActions";

export default async function SpamReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  requireArea(session, "support");
  const { id } = await params;
  const report = await prisma.spamReport.findUnique({
    where: { id },
    include: {
      lead: true,
      agent: { include: { user: true, wallet: true } },
      leadAssignment: true,
    },
  });
  if (!report) notFound();

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title={`Spam report for ${report.lead.code}`} subtitle="Review the customer issue and decide whether a refund is warranted." />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-navy-900">Lead details</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Lead ID" value={<Link href={`/admin/leads/${report.leadId}`} className="text-brand-700 hover:underline">{report.lead.code}</Link>} />
            <Row label="Destination" value={report.lead.destinationText} />
            <Row label="Travel date" value={report.lead.travelDate ? formatDate(report.lead.travelDate) : report.lead.travelDateText || "—"} />
            <Row label="Travelers" value={report.lead.travelers?.toString() || "—"} />
            <Row label="Purchase price" value={formatINR(report.leadAssignment?.price ?? report.lead.price ?? 0)} />
            <Row label="Report date" value={formatDateTime(report.createdAt)} />
          </dl>

          <h2 className="pt-2 font-semibold text-navy-900">Vendor details</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Vendor" value={report.agent.companyName} />
            <Row label="Contact" value={report.agent.user.name} />
            <Row label="Email" value={report.agent.user.email} />
            <Row label="Wallet" value={formatINR(report.agent.wallet?.balance ?? 0)} />
          </dl>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Moderation</h2>
            <Badge className={report.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : report.status === "REJECTED" ? "bg-rose-50 text-rose-700 ring-rose-600/20" : "bg-amber-50 text-amber-700 ring-amber-600/20"}>{titleCase(report.status)}</Badge>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium text-navy-700">Reason:</span> {titleCase(report.reason)}</p>
            <p><span className="font-medium text-navy-700">Vendor notes:</span> {report.notes || "—"}</p>
            <p><span className="font-medium text-navy-700">Resolved:</span> {report.reviewedAt ? formatDateTime(report.reviewedAt) : "—"}</p>
            <p><span className="font-medium text-navy-700">Refund amount:</span> {report.refundAmount != null ? formatINR(report.refundAmount) : "—"}</p>
          </div>
          <SpamReportActions id={report.id} status={report.status} />
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-navy-100 bg-navy-50/40 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="mt-1 font-medium text-navy-800">{value}</dd>
    </div>
  );
}