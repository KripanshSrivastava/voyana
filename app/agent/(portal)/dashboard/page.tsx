import Link from "next/link";
import { Wallet, ShoppingBag, Trophy, Inbox, ArrowRight } from "lucide-react";
import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { countAvailableLeads } from "@/lib/agent/leads";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { Card, EmptyState, ButtonLink } from "@/components/ui";
import { formatINR, formatDate, titleCase } from "@/lib/utils";

export default async function AgentDashboard() {
  const { session, agent } = await requireAgent();
  const [assignments, availableCount, wonCount, totalBought] = await Promise.all([
    prisma.leadAssignment.findMany({
      where: { agentId: agent.id },
      orderBy: { purchasedAt: "desc" },
      take: 5,
      include: { lead: { include: { destination: { select: { name: true } } } } },
    }),
    countAvailableLeads(agent.id),
    prisma.leadAssignment.count({ where: { agentId: agent.id, status: "WON" } }),
    prisma.leadAssignment.count({ where: { agentId: agent.id } }),
  ]);

  return (
    <div>
      <PageHeader title={`Welcome, ${session.name.split(" ")[0]}`} subtitle="Your lead marketplace and performance." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Wallet balance" value={formatINR(agent.wallet?.balance ?? 0)} icon={<Wallet className="h-5 w-5" />} accent="brand" />
        <StatCard label="Leads purchased" value={totalBought} icon={<ShoppingBag className="h-5 w-5" />} accent="navy" />
        <StatCard label="Won" value={wonCount} icon={<Trophy className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Available now" value={availableCount} icon={<Inbox className="h-5 w-5" />} accent="sun" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-navy-900">Recent purchases</h2>
            <Link href="/agent/purchases" className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">All <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {assignments.length === 0 ? (
            <EmptyState title="No purchases yet" description="Browse available leads to get started." action={<ButtonLink href="/agent/leads" variant="brand">Browse leads</ButtonLink>} />
          ) : (
            <div className="divide-y divide-navy-50">
              {assignments.map((a) => (
                <Link key={a.id} href={`/agent/leads/${a.leadId}`} className="flex items-center justify-between py-3 hover:bg-navy-50/40">
                  <div>
                    <div className="font-medium text-navy-800">{a.lead.destination?.name || a.lead.destinationText}</div>
                    <div className="text-xs text-navy-400">{a.lead.code} · {formatDate(a.purchasedAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-navy-900">{formatINR(a.price)}</div>
                    <div className="text-xs text-navy-400">{titleCase(a.status)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex flex-col items-start justify-center p-6">
          <h2 className="font-semibold text-navy-900">Find new leads</h2>
          <p className="mt-1 text-sm text-navy-500">{availableCount} qualified lead{availableCount === 1 ? "" : "s"} available to purchase right now.</p>
          <ButtonLink href="/agent/leads" variant="primary" className="mt-4">Browse marketplace</ButtonLink>
        </Card>
      </div>
    </div>
  );
}
