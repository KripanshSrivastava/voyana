import Link from "next/link";
import {
  Inbox, CheckCircle2, ShoppingCart, Users, TrendingUp, IndianRupee, ArrowRight,
  MapPin, Package, Compass,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { revenueWindows, dailyRevenueSeries } from "@/lib/admin/analytics";
import { StatCard, PageHeader, StatusBadge, QualityBadge } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { EmptyState } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/utils";

export default async function AdminDashboard() {
  const [
    newLeads, qualified, available, assigned, converted,
    rev, series, recent,
    pendingAgents, approvedAgents,
    pubDest, pubPkg, pubTour,
    totalLeads,
  ] = await Promise.all([
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count({ where: { status: "QUALIFIED" } }),
    prisma.lead.count({ where: { status: "AVAILABLE" } }),
    prisma.lead.count({ where: { assignmentCount: { gt: 0 } } }),
    prisma.lead.count({ where: { status: "CONVERTED" } }),
    revenueWindows(),
    dailyRevenueSeries(14),
    // Only the columns the recent-leads table actually renders — trims ~30
    // unused fields (UTM/attribution/dedup pointers/message) per row.
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, code: true, customerName: true, destinationText: true, quality: true, status: true, createdAt: true },
    }),
    prisma.agent.count({ where: { status: "PENDING" } }),
    prisma.agent.count({ where: { status: "APPROVED" } }),
    prisma.destination.count({ where: { published: true } }),
    prisma.tourPackage.count({ where: { published: true, kind: "PACKAGE" } }),
    prisma.tourPackage.count({ where: { published: true, kind: "TOUR" } }),
    prisma.lead.count(),
  ]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Lead operations at a glance — live from your database." />

      {/* Lead metrics (priority) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="New leads" value={newLeads} icon={<Inbox className="h-5 w-5" />} accent="brand" hint="Awaiting review" />
        <StatCard label="Qualified" value={qualified} icon={<CheckCircle2 className="h-5 w-5" />} accent="navy" />
        <StatCard label="Available to agents" value={available} icon={<ShoppingCart className="h-5 w-5" />} accent="sun" />
        <StatCard label="Assigned" value={assigned} icon={<Users className="h-5 w-5" />} accent="navy" hint="Purchased by ≥1 agent" />
        <StatCard label="Converted" value={converted} icon={<TrendingUp className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Total revenue" value={formatINR(rev.all)} icon={<IndianRupee className="h-5 w-5" />} accent="emerald" hint={`Avg lead ${formatINR(rev.avgLeadPrice)}`} />
      </div>

      {/* Revenue */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Revenue (last 14 days)</h2>
            <Link href="/admin/revenue" className="text-sm font-medium text-brand-700 hover:underline">Details</Link>
          </div>
          {rev.all === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-navy-400">No lead purchases yet.</div>
          ) : (
            <RevenueChart data={series} />
          )}
        </div>
        <div className="grid gap-4">
          <StatCard label="Today" value={formatINR(rev.today)} accent="brand" />
          <StatCard label="This week" value={formatINR(rev.week)} accent="brand" />
          <StatCard label="This month" value={formatINR(rev.month)} accent="brand" />
        </div>
      </div>

      {/* Recent leads */}
      <div className="mt-6 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">Recent leads</h2>
          <Link href="/admin/leads" className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            All leads <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="No leads yet" description="New travel requests from the website will appear here." />
        ) : (
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="py-2 pr-4 font-medium">Lead</th>
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 pr-4 font-medium">Destination</th>
                  <th className="py-2 pr-4 font-medium">Quality</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {recent.map((l) => (
                  <tr key={l.id} className="hover:bg-navy-50/50">
                    <td className="py-2.5 pr-4">
                      <Link href={`/admin/leads/${l.id}`} className="font-medium text-brand-700 hover:underline">{l.code}</Link>
                    </td>
                    <td className="py-2.5 pr-4 text-navy-700">{l.customerName}</td>
                    <td className="py-2.5 pr-4 text-navy-700">{l.destinationText}</td>
                    <td className="py-2.5 pr-4"><QualityBadge quality={l.quality} /></td>
                    <td className="py-2.5 pr-4"><StatusBadge status={l.status} /></td>
                    <td className="py-2.5 pr-4 text-navy-500">{formatDate(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Agent + content overview */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-navy-900">Agent activity</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Pending approval" value={pendingAgents} accent="sun" />
            <StatCard label="Approved agents" value={approvedAgents} accent="emerald" />
          </div>
          <Link href="/admin/agents" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            Manage agents <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-navy-900">Published content</h2>
          <div className="grid grid-cols-3 gap-3">
            <ContentStat icon={<MapPin className="h-4 w-4" />} label="Destinations" value={pubDest} href="/admin/destinations" />
            <ContentStat icon={<Package className="h-4 w-4" />} label="Packages" value={pubPkg} href="/admin/packages" />
            <ContentStat icon={<Compass className="h-4 w-4" />} label="Tours" value={pubTour} href="/admin/tours" />
          </div>
          <p className="mt-4 text-xs text-navy-400">{totalLeads} total leads captured all-time.</p>
        </div>
      </div>
    </div>
  );
}

function ContentStat({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-navy-100 p-4 text-center hover:border-brand-300">
      <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>
      <div className="mt-2 text-xl font-bold text-navy-900">{value}</div>
      <div className="text-xs text-navy-500">{label}</div>
    </Link>
  );
}
