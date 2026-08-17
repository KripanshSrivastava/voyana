import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { canAccess } from "@/lib/rbac";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { revenueWindows, dailyRevenueSeries } from "@/lib/admin/analytics";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { RevenueChart, BarBreakdown } from "@/components/admin/RevenueChart";
import { Card, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/utils";

export default async function RevenuePage() {
  const session = await requireAdmin();
  if (!canAccess(session, "finance")) return <AccessRestricted area="Revenue" />;
  const [rev, series, payments] = await Promise.all([
    revenueWindows(),
    dailyRevenueSeries(30),
    prisma.leadPayment.findMany({
      include: { agent: { select: { companyName: true } }, lead: { select: { destinationText: true, utmSource: true, packageSnapshotName: true } } },
    }),
  ]);

  function group(keyFn: (p: (typeof payments)[number]) => string) {
    const map = new Map<string, number>();
    for (const p of payments) {
      const k = keyFn(p) || "—";
      map.set(k, (map.get(k) ?? 0) + p.amount);
    }
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }

  const byAgent = group((p) => p.agent.companyName);
  const bySource = group((p) => p.lead.utmSource || "direct");
  const byDestination = group((p) => p.lead.destinationText);
  const byPackage = group((p) => p.lead.packageSnapshotName || "No package");

  return (
    <div>
      <PageHeader title="Revenue" subtitle="Actual revenue from lead purchases." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Today" value={formatINR(rev.today)} accent="brand" />
        <StatCard label="This week" value={formatINR(rev.week)} accent="brand" />
        <StatCard label="This month" value={formatINR(rev.month)} accent="brand" />
        <StatCard label="All time" value={formatINR(rev.all)} accent="emerald" />
        <StatCard label="Avg lead price" value={formatINR(rev.avgLeadPrice)} accent="navy" />
      </div>

      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-semibold text-navy-900">Revenue (last 30 days)</h2>
        {rev.all === 0 ? (
          <EmptyState title="No lead purchases yet" description="Revenue appears here once agents start buying leads." />
        ) : (
          <RevenueChart data={series} />
        )}
      </Card>

      {payments.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-6"><h3 className="mb-4 font-semibold text-navy-900">By agent</h3><BarBreakdown data={byAgent} /></Card>
          <Card className="p-6"><h3 className="mb-4 font-semibold text-navy-900">By source</h3><BarBreakdown data={bySource} /></Card>
          <Card className="p-6"><h3 className="mb-4 font-semibold text-navy-900">By destination</h3><BarBreakdown data={byDestination} /></Card>
          <Card className="p-6"><h3 className="mb-4 font-semibold text-navy-900">By package</h3><BarBreakdown data={byPackage} /></Card>
        </div>
      )}
    </div>
  );
}
