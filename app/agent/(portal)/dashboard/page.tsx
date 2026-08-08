import Link from "next/link";
import { Wallet, ShoppingBag, Trophy, Inbox, ArrowRight } from "lucide-react";
import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { countAvailableLeads, searchAvailableLeads } from "@/lib/agent/leads";
import { getSiteSettings } from "@/lib/settings";
import { computeLeadCharge, exclusiveEligible, requiresExclusive } from "@/lib/leads/pricing";
import { leadDisplayTitle } from "@/lib/leads/display";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { Card, EmptyState, ButtonLink } from "@/components/ui";
import { AvailableLeadCard } from "@/components/agent/AvailableLeadCard";
import { formatINR, formatDate, titleCase } from "@/lib/utils";

// How many available leads to show inline on the dashboard. Kept small so
// the dashboard stays fast; the "Browse all" link goes to the full list.
const DASHBOARD_AVAILABLE_LIMIT = 6;

export default async function AgentDashboard() {
  const { session, agent } = await requireAgent();
  const [assignments, availableCount, wonCount, totalBought, availableResult, settings] = await Promise.all([
    prisma.leadAssignment.findMany({
      where: { agentId: agent.id },
      orderBy: { purchasedAt: "desc" },
      take: 5,
      include: { lead: { include: { destination: { select: { name: true } } } } },
    }),
    countAvailableLeads(agent.id),
    prisma.leadAssignment.count({ where: { agentId: agent.id, status: "WON" } }),
    prisma.leadAssignment.count({ where: { agentId: agent.id } }),
    searchAvailableLeads(agent.id, { page: 1, limit: DASHBOARD_AVAILABLE_LIMIT }),
    getSiteSettings(),
  ]);

  const canBuy = agent.status === "APPROVED";
  const credits = agent.creditBalance?.balance ?? 0;

  return (
    <div>
      <PageHeader title={`Welcome, ${session.name.split(" ")[0]}`} subtitle="Your lead marketplace and performance." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Wallet balance" value={formatINR(agent.wallet?.balance ?? 0)} icon={<Wallet className="h-5 w-5" />} accent="brand" />
        <StatCard label="Leads purchased" value={totalBought} icon={<ShoppingBag className="h-5 w-5" />} accent="navy" />
        <StatCard label="Won" value={wonCount} icon={<Trophy className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Available now" value={availableCount} icon={<Inbox className="h-5 w-5" />} accent="sun" />
      </div>

      {/* Inline Available Leads — the dashboard's job is to make the marketplace
          immediately actionable, so the leads themselves render here instead of
          the old "Find new leads" redirect card. Uses the same <AvailableLeadCard />
          component as /agent/leads so behaviour stays identical. */}
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">Available now</h2>
          {availableCount > DASHBOARD_AVAILABLE_LIMIT && (
            <Link href="/agent/leads" className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
              Browse all {availableCount.toLocaleString("en-IN")} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        {availableResult.items.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              title="No leads available right now"
              description="New qualified enquiries will appear here as soon as they're published. Check back shortly."
            />
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {availableResult.items.map((l) => (
              <AvailableLeadCard
                key={l.id}
                lead={{
                  id: l.id,
                  destinationText: l.destinationText,
                  destinationName: l.destination?.name ?? null,
                  tripType: l.tripType,
                  tripCategory: l.tripCategory,
                  travelers: l.travelers,
                  adults: l.adults,
                  children: l.children,
                  nights: l.nights,
                  requirements: l.requirements,
                  travelDate: l.travelDate,
                  travelDateText: l.travelDateText,
                  createdAt: l.createdAt,
                  assignmentCount: l._count.assignments,
                  maxAgents: l.maxAgents,
                }}
                shared={computeLeadCharge({ tripCategory: l.tripCategory, purchaseType: "SHARED", settings })}
                exclusive={{
                  ...computeLeadCharge({ tripCategory: l.tripCategory, purchaseType: "EXCLUSIVE", settings }),
                  eligible: exclusiveEligible(l._count.assignments),
                }}
                exclusiveOnly={requiresExclusive(l.tripCategory)}
                canBuy={canBuy}
                creditsAvailable={credits}
              />
            ))}
          </div>
        )}
      </div>

      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">Recent purchases</h2>
          <Link href="/agent/purchases" className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">All <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {assignments.length === 0 ? (
          <EmptyState title="No purchases yet" description="Purchase a lead above to see it here." />
        ) : (
          <div className="divide-y divide-navy-50">
            {assignments.map((a) => (
              <Link key={a.id} href={`/agent/leads/${a.leadId}`} className="flex items-center justify-between py-3 hover:bg-navy-50/40">
                <div>
                  <div className="font-medium text-navy-800">
                    {leadDisplayTitle({
                      destinationText: a.lead.destinationText,
                      destinationName: a.lead.destination?.name,
                      tripType: a.lead.tripType,
                      tripCategory: a.lead.tripCategory,
                    })}
                  </div>
                  <div className="text-xs text-navy-400">Purchased {formatDate(a.purchasedAt)}</div>
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
    </div>
  );
}
