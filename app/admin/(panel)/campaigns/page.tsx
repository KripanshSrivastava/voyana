import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type Row = {
  source: string;
  campaign: string;
  leads: number;
  qualified: number;
  sold: number;
  revenue: number;
  converted: number;
};

export default async function CampaignsPage() {
  const leads = await prisma.lead.findMany({
    include: { payments: { select: { amount: true } }, _count: { select: { assignments: true } } },
  });

  const map = new Map<string, Row>();
  for (const l of leads) {
    const source = l.utmSource || "direct";
    const campaign = l.utmCampaign || "—";
    const key = `${source}||${campaign}`;
    const row = map.get(key) ?? { source, campaign, leads: 0, qualified: 0, sold: 0, revenue: 0, converted: 0 };
    row.leads += 1;
    if (["QUALIFIED", "AVAILABLE", "SHARED", "IN_PROGRESS", "CONVERTED"].includes(l.status)) row.qualified += 1;
    if (l._count.assignments > 0) row.sold += 1;
    if (l.status === "CONVERTED") row.converted += 1;
    row.revenue += l.payments.reduce((s, p) => s + p.amount, 0);
    map.set(key, row);
  }
  const rows = [...map.values()].sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);

  return (
    <div>
      <PageHeader title="Marketing analytics" subtitle="Performance by source and campaign — real data only." />
      {rows.length === 0 ? (
        <EmptyState title="No leads yet" description="Marketing performance appears here as attributed leads arrive." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-navy-50/60">
                <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium">Leads</th>
                  <th className="px-4 py-3 font-medium">Qualified</th>
                  <th className="px-4 py-3 font-medium">Sold</th>
                  <th className="px-4 py-3 font-medium">Converted</th>
                  <th className="px-4 py-3 font-medium">Conv. rate</th>
                  <th className="px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {rows.map((r) => (
                  <tr key={`${r.source}-${r.campaign}`} className="hover:bg-navy-50/40">
                    <td className="px-4 py-3 font-medium capitalize text-navy-800">{r.source}</td>
                    <td className="px-4 py-3 text-navy-700">{r.campaign}</td>
                    <td className="px-4 py-3 text-navy-700">{r.leads}</td>
                    <td className="px-4 py-3 text-navy-700">{r.qualified}</td>
                    <td className="px-4 py-3 text-navy-700">{r.sold}</td>
                    <td className="px-4 py-3 text-navy-700">{r.converted}</td>
                    <td className="px-4 py-3 text-navy-700">{r.leads ? Math.round((r.converted / r.leads) * 100) : 0}%</td>
                    <td className="px-4 py-3 font-semibold text-navy-900">{formatINR(r.revenue)}</td>
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
