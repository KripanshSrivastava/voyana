import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { canAccess } from "@/lib/rbac";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { PageHeader } from "@/components/admin/ui";
import { Card, Badge, EmptyState } from "@/components/ui";
import { formatDateTime, titleCase } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700 ring-blue-600/20",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-600/20",
  WAITING_VENDOR: "bg-violet-50 text-violet-700 ring-violet-600/20",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await requireAdmin();
  if (!canAccess(session, "support")) return <AccessRestricted area="Support" />;
  const { status } = await searchParams;

  const tickets = await prisma.supportTicket.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: "desc" },
    include: { agent: { select: { companyName: true } }, _count: { select: { messages: true } } },
    take: 200,
  });

  const tabs = ["ALL", "OPEN", "IN_PROGRESS", "WAITING_VENDOR", "RESOLVED", "CLOSED"];

  return (
    <div>
      <PageHeader title="Support" subtitle="Vendor support tickets." />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-navy-100/60 p-1">
        {tabs.map((t) => (
          <Link
            key={t}
            href={t === "ALL" ? "/admin/support" : `/admin/support?status=${t}`}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${(status ?? "ALL") === t ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-800"}`}
          >
            {titleCase(t)}
          </Link>
        ))}
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="No tickets" description="No vendor support tickets match this filter." />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} href={`/admin/support/${t.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-navy-50/40">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_STYLE[t.status] ?? ""}>{titleCase(t.status)}</Badge>
                    <Badge className="bg-navy-100 text-navy-700 ring-navy-500/20">{titleCase(t.category)}</Badge>
                  </div>
                  <div className="mt-1 font-medium text-navy-800">{t.subject}</div>
                  <div className="text-xs text-navy-400">{t.agent.companyName} · {t._count.messages} message{t._count.messages === 1 ? "" : "s"} · {formatDateTime(t.updatedAt)}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
