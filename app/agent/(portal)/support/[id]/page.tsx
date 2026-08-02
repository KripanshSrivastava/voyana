import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { Card, Badge } from "@/components/ui";
import { ReplyForm } from "@/components/support/SupportUI";
import { formatDateTime, titleCase, cn } from "@/lib/utils";

export default async function AgentTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { agent } = await requireAgent();
  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { messages: { where: { internal: false }, orderBy: { createdAt: "asc" } } },
  });
  if (!ticket || ticket.agentId !== agent.id) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/agent/support" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"><ArrowLeft className="h-4 w-4" /> Back to support</Link>
      <PageHeader title={ticket.subject} subtitle={titleCase(ticket.category)} action={<Badge className="bg-navy-100 text-navy-700 ring-navy-500/20">{titleCase(ticket.status)}</Badge>} />
      <Card className="p-6 space-y-4">
        <div className="space-y-3">
          {ticket.messages.map((m) => (
            <div key={m.id} className={cn("rounded-xl px-4 py-3 text-sm", m.authorType === "ADMIN" ? "bg-brand-50" : "bg-navy-50")}>
              <div className="mb-1 flex items-center justify-between text-xs text-navy-400">
                <span className="font-medium text-navy-600">{m.authorType === "ADMIN" ? "Voyana Support" : m.authorLabel}</span>
                <span>{formatDateTime(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-navy-800">{m.body}</p>
            </div>
          ))}
        </div>
        {ticket.status !== "CLOSED" && <div className="border-t border-navy-50 pt-4"><ReplyForm ticketId={ticket.id} /></div>}
      </Card>
    </div>
  );
}
