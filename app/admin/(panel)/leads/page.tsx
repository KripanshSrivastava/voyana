import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { canAccess } from "@/lib/rbac";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { PageHeader, StatusBadge, QualityBadge } from "@/components/admin/ui";
import { LeadFilters } from "@/components/admin/LeadFilters";
import { Badge, EmptyState, ButtonLink } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

const PAGE_SIZE = 20;

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireAdmin();
  if (!canAccess(session, "leads")) return <AccessRestricted area="Leads" />;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.LeadWhereInput = {};
  if (sp.status) where.status = sp.status;
  if (sp.quality) where.quality = sp.quality;
  if (sp.source) where.utmSource = sp.source;
  if (sp.q) {
    where.OR = [
      { code: { contains: sp.q } },
      { phone: { contains: sp.q } },
      { email: { contains: sp.q } },
      { destinationText: { contains: sp.q } },
      { customerName: { contains: sp.q } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      // Only the columns the table renders — strips 25+ UTM/attribution/dedup
      // fields plus large text columns (message, requirements) from the wire.
      select: {
        id: true,
        code: true,
        customerName: true,
        phone: true,
        destinationText: true,
        budget: true,
        utmSource: true,
        quality: true,
        status: true,
        price: true,
        createdAt: true,
        isDuplicate: true,
        maxAgents: true,
        _count: { select: { assignments: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${total} lead${total === 1 ? "" : "s"} match your filters.`}
        action={<ButtonLink href="/admin/leads/new" variant="brand"><Plus className="h-4 w-4" /> Add lead</ButtonLink>}
      />
      <LeadFilters />

      {leads.length === 0 ? (
        <EmptyState title="No leads yet" description="New travel requests will appear here as travelers submit the form." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-navy-50/60">
                <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="px-4 py-3 font-medium">Lead ID</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Destination</th>
                  <th className="px-4 py-3 font-medium">Budget</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Quality</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Shared</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-navy-50/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads/${l.id}`} className="font-semibold text-brand-700 hover:underline">{l.code}</Link>
                      {l.isDuplicate && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-600/20">DUP</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy-800">{l.customerName}</div>
                      <div className="text-xs text-navy-400">{l.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-navy-700">{l.destinationText}</td>
                    <td className="px-4 py-3 text-navy-700">{l.budget ? formatINR(l.budget) : "—"}</td>
                    <td className="px-4 py-3 text-navy-600">{l.utmSource || "direct"}</td>
                    <td className="px-4 py-3"><QualityBadge quality={l.quality} /></td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-3">
                      <Badge className={l._count.assignments >= l.maxAgents ? "bg-rose-50 text-rose-700 ring-rose-600/20" : "bg-navy-100 text-navy-600 ring-navy-500/20"}>
                        {l._count.assignments}/{l.maxAgents}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-navy-700">{l.price ? formatINR(l.price) : "—"}</td>
                    <td className="px-4 py-3 text-navy-500">{formatDate(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} sp={sp} />
      )}
    </div>
  );
}

function Pagination({ page, totalPages, sp }: { page: number; totalPages: number; sp: Record<string, string | undefined> }) {
  const build = (p: number) => {
    const params = new URLSearchParams(sp as Record<string, string>);
    params.set("page", String(p));
    return `?${params.toString()}`;
  };
  return (
    <div className="mt-5 flex items-center justify-between text-sm text-navy-500">
      <span>Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={build(page - 1)} className="rounded-lg border border-navy-200 px-3 py-1.5 hover:bg-navy-50">Previous</Link>}
        {page < totalPages && <Link href={build(page + 1)} className="rounded-lg border border-navy-200 px-3 py-1.5 hover:bg-navy-50">Next</Link>}
      </div>
    </div>
  );
}
