import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, AgentStatusBadge } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/utils";

export default async function AgentsPage() {
  const agents = await prisma.agent.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      user: true,
      wallet: true,
      _count: { select: { assignments: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Agents" subtitle={`${agents.length} registered partner${agents.length === 1 ? "" : "s"}.`} />
      {agents.length === 0 ? (
        <EmptyState title="No agents yet" description="Approved partners can purchase leads. New signups will appear here for approval." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-navy-50/60">
                <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="px-4 py-3 font-medium">Agency</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Wallet</th>
                  <th className="px-4 py-3 font-medium">Leads bought</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {agents.map((a) => (
                  <tr key={a.id} className="hover:bg-navy-50/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-navy-800">{a.companyName}</div>
                      <div className="text-xs text-navy-400">{a.city || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-navy-700">{a.user.name}</div>
                      <div className="text-xs text-navy-400">{a.phone}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-navy-800">{formatINR(a.wallet?.balance ?? 0)}</td>
                    <td className="px-4 py-3 text-navy-700">{a._count.assignments}</td>
                    <td className="px-4 py-3"><AgentStatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 text-navy-500">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/agents/${a.id}`} className="font-medium text-brand-700 hover:underline">Manage</Link>
                    </td>
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
