import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { canAccess } from "@/lib/rbac";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/utils";

export default async function WalletsPage() {
  const session = await requireAdmin();
  if (!canAccess(session, "finance")) return <AccessRestricted area="Wallets" />;
  const wallets = await prisma.agentWallet.findMany({
    include: { agent: { include: { user: true, _count: { select: { assignments: true } } } } },
    orderBy: { balance: "desc" },
  });
  const totalFloat = wallets.reduce((s, w) => s + w.balance, 0);
  const spent = await prisma.leadPayment.aggregate({ _sum: { amount: true } });

  return (
    <div>
      <PageHeader title="Wallets" subtitle="Agent wallet balances and platform float." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total wallet float" value={formatINR(totalFloat)} accent="brand" />
        <StatCard label="Total spent on leads" value={formatINR(spent._sum.amount ?? 0)} accent="emerald" />
        <StatCard label="Active wallets" value={wallets.length} accent="navy" />
      </div>

      {wallets.length === 0 ? (
        <EmptyState title="No wallets yet" description="Agent wallets are created on signup." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-navy-50/60">
              <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="px-4 py-3 font-medium">Agency</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Leads bought</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {wallets.map((w) => (
                <tr key={w.id} className="hover:bg-navy-50/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-navy-800">{w.agent.companyName}</div>
                    <div className="text-xs text-navy-400">{w.agent.user.name}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-navy-900">{formatINR(w.balance)}</td>
                  <td className="px-4 py-3 text-navy-700">{w.agent._count.assignments}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/agents/${w.agent.id}`} className="font-medium text-brand-700 hover:underline">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
