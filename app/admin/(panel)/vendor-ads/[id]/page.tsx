import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { requireArea } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/ui";
import { Card, Badge } from "@/components/ui";
import { formatDate, formatDateTime, titleCase } from "@/lib/utils";
import { VendorAdActions } from "@/components/admin/VendorAdActions";

export default async function VendorAdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  requireArea(session, "marketing");
  const { id } = await params;
  const ad = await prisma.vendorAd.findUnique({ where: { id }, include: { agent: { include: { user: true } } } });
  if (!ad) notFound();

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title={ad.title} subtitle="Moderate the vendor's campaign and keep the marketplace compliant." />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-navy-900">Campaign details</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Vendor" value={ad.agent.companyName} />
            <Row label="Contact" value={ad.agent.user.name} />
            <Row label="Email" value={ad.agent.user.email} />
            <Row label="Destination" value={ad.destination || "—"} />
            <Row label="Client location" value={ad.clientLocation || "—"} />
            <Row label="Category" value={ad.category ? titleCase(ad.category) : "—"} />
            <Row label="Budget" value={ad.dailyBudget ? `₹${ad.dailyBudget.toLocaleString("en-IN")}` : "—"} />
            <Row label="Bid" value={ad.maxBid ? `₹${ad.maxBid.toLocaleString("en-IN")}` : "—"} />
            <Row label="Start date" value={ad.startDate ? formatDate(ad.startDate) : "—"} />
            <Row label="End date" value={ad.endDate ? formatDate(ad.endDate) : "—"} />
            <Row label="Created" value={formatDateTime(ad.createdAt)} />
            <Row label="Clicks / impressions" value={`${ad.clicks} / ${ad.impressions}`} />
          </dl>

          <h2 className="pt-2 font-semibold text-navy-900">Creative</h2>
          <p className="rounded-lg border border-navy-100 bg-navy-50/40 p-4 text-sm text-navy-700">{ad.description || "—"}</p>
          {ad.landingUrl && <Link href={ad.landingUrl} className="text-sm font-medium text-brand-700 hover:underline">{ad.landingUrl}</Link>}
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Moderation</h2>
            <Badge className={ad.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : ad.status === "REJECTED" ? "bg-rose-50 text-rose-700 ring-rose-600/20" : ad.status === "PAUSED" ? "bg-amber-50 text-amber-700 ring-amber-600/20" : "bg-slate-100 text-slate-600 ring-slate-500/20"}>{titleCase(ad.status)}</Badge>
          </div>
          <VendorAdActions id={ad.id} status={ad.status} />
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