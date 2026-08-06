import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { canAccess } from "@/lib/rbac";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { PageHeader } from "@/components/admin/ui";
import { Card, Badge } from "@/components/ui";
import { ReplyForm, TicketStatusControl } from "@/components/support/SupportUI";
import { formatDateTime, titleCase, cn } from "@/lib/utils";

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!canAccess(session, "support")) return <AccessRestricted area="Support" />;
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      agent: { select: { companyName: true, id: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/support" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"><ArrowLeft className="h-4 w-4" /> Back to support</Link>
      <PageHeader
        title={ticket.subject}
        subtitle={`${ticket.agent.companyName} · ${titleCase(ticket.category)}`}
        action={<TicketStatusControl id={ticket.id} status={ticket.status} />}
      />
      <Card className="p-6 space-y-4">
        <div className="space-y-3">
          {ticket.messages.map((m) => (
            <div key={m.id} className={cn("rounded-xl px-4 py-3 text-sm", m.internal ? "border border-dashed border-amber-300 bg-amber-50" : m.authorType === "ADMIN" ? "bg-brand-50" : "bg-navy-50")}>
              <div className="mb-1 flex items-center justify-between text-xs text-navy-400">
                <span className="font-medium text-navy-600">
                  {m.authorType === "ADMIN" ? "Moksh Booking Support" : m.authorLabel}
                  {m.internal && <Badge className="ml-2 bg-amber-100 text-amber-700 ring-amber-600/20">Internal note</Badge>}
                </span>
                <span>{formatDateTime(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-navy-800">{m.body}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-navy-50 pt-4">
          <ReplyForm ticketId={ticket.id} isAdmin />
        </div>
      </Card>
    </div>
  );
}
