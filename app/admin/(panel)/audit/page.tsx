import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { canAccess } from "@/lib/rbac";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { PageHeader } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/ui";
import { formatDateTime, parseJson } from "@/lib/utils";

export default async function AuditPage() {
  const session = await requireAdmin();
  if (!canAccess(session, "settings")) return <AccessRestricted area="Audit log" />;
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Sensitive actions across leads, wallets and agents." />
      {logs.length === 0 ? (
        <EmptyState title="No audit events yet" description="Price changes, purchases, wallet adjustments and agent approvals are recorded here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-navy-50/60">
                <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {logs.map((l) => {
                  const meta = parseJson<Record<string, unknown>>(l.metadata, {});
                  return (
                    <tr key={l.id} className="hover:bg-navy-50/40">
                      <td className="px-4 py-3 whitespace-nowrap text-navy-500">{formatDateTime(l.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-navy-800">{l.actorLabel ?? l.actorType}</span>
                        <span className="ml-1 text-xs text-navy-400">{l.actorType}</span>
                      </td>
                      <td className="px-4 py-3"><Badge className="bg-navy-100 text-navy-700 ring-navy-500/20">{l.action}</Badge></td>
                      <td className="px-4 py-3 text-navy-600">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ""}</td>
                      <td className="px-4 py-3 text-xs text-navy-500">{Object.keys(meta).length ? JSON.stringify(meta) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
