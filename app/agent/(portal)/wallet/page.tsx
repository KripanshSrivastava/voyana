import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { Card, EmptyState } from "@/components/ui";
import { AddMoney } from "@/components/agent/AddMoney";
import { formatINR, formatDateTime } from "@/lib/utils";

export default async function WalletPage() {
  const { agent } = await requireAgent();
  const [balance, ledger, purchases, packages, used] = await Promise.all([
    prisma.agentCreditBalance.findUnique({ where: { agentId: agent.id } }),
    prisma.leadCreditLedger.findMany({ where: { agentId: agent.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.leadCreditPurchase.findMany({ where: { agentId: agent.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.leadCreditPackage.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }], take: 2 }),
    prisma.leadCreditLedger.aggregate({ _sum: { creditAmount: true }, where: { agentId: agent.id, type: "LEAD_PURCHASE" } }),
  ]);
  const credits = balance?.balance ?? 0;

  return (
    <div>
      <PageHeader title="Lead Credits" subtitle="Buy credit packages, view credit history, and track package purchases." />

      {credits > 0 && credits <= 20 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Only {credits.toLocaleString("en-IN")} Lead Credits remaining. Your Auto-Buy may stop soon.
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Lead Credits" value={credits.toLocaleString("en-IN")} accent="brand" />
        <StatCard label="Credits Used" value={Math.abs(used._sum.creditAmount ?? 0).toLocaleString("en-IN")} accent="navy" />
        <StatCard label="Packages Purchased" value={purchases.filter((p) => p.status === "PAID").length} accent="emerald" />
      </div>

      <Card className="mb-6 p-6">
        <h2 className="mb-1 font-semibold text-navy-900">Get More Travel Leads</h2>
        <p className="mb-5 text-sm text-navy-500">Choose your Lead Credit Package</p>
        {packages.length === 0 ? (
          <EmptyState title="No packages available" description="The Voyana team is updating Lead Credit packages." />
        ) : (
          <AddMoney packages={packages} />
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-navy-900">Credit History</h2>
          {ledger.length === 0 ? (
            <EmptyState title="No credit history yet" description="Package purchases and lead purchases will appear here." />
          ) : (
            <div className="divide-y divide-navy-50">
              {ledger.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-navy-800">{t.description}</div>
                    <div className="text-xs text-navy-400">{formatDateTime(t.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className={t.creditAmount >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>
                      {t.creditAmount >= 0 ? "+" : ""}{t.creditAmount}
                    </div>
                    <div className="text-xs text-navy-400">Balance {t.balanceAfter}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-navy-900">Package History</h2>
          {purchases.length === 0 ? (
            <EmptyState title="No package purchases yet" description="Your paid Lead Credit packages will appear here." />
          ) : (
            <div className="divide-y divide-navy-50">
              {purchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-navy-800">{p.packageName}</div>
                    <div className="text-xs text-navy-400">Purchased: {formatDateTime(p.paidAt ?? p.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-navy-900">{p.credits} credits / {formatINR(p.priceInr)}</div>
                    <div className="text-xs text-navy-400">Status: {p.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
