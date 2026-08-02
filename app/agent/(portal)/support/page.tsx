import Link from "next/link";
import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getFlags } from "@/lib/flags";
import { PageHeader } from "@/components/admin/ui";
import { Card, Badge, EmptyState } from "@/components/ui";
import { NewTicketForm } from "@/components/support/SupportUI";
import { formatDateTime, titleCase } from "@/lib/utils";

export default async function AgentSupportPage() {
  const { agent } = await requireAgent();
  const flags = await getFlags();
  if (!flags.supportEnabled) {
    return <div><PageHeader title="Support" /><Card className="p-6 text-sm text-navy-500">Support is currently unavailable.</Card></div>;
  }
  const tickets = await prisma.supportTicket.findMany({ where: { agentId: agent.id }, orderBy: { updatedAt: "desc" } });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Support" subtitle="Raise a request and track its status." />
      <NewTicketForm />
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-navy-900">Your tickets</h2>
        {tickets.length === 0 ? (
          <EmptyState title="No tickets yet" description="Create a ticket above and our team will respond." />
        ) : (
          <div className="divide-y divide-navy-50">
            {tickets.map((t) => (
              <Link key={t.id} href={`/agent/support/${t.id}`} className="flex items-center justify-between py-3 hover:bg-navy-50/40">
                <div>
                  <div className="font-medium text-navy-800">{t.subject}</div>
                  <div className="text-xs text-navy-400">{titleCase(t.category)} · {formatDateTime(t.updatedAt)}</div>
                </div>
                <Badge className="bg-navy-100 text-navy-700 ring-navy-500/20">{titleCase(t.status)}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
