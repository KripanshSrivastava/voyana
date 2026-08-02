import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export default async function IntegrationLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ integration?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const logs = await prisma.integrationLog.findMany({
    where: { ...(sp.integration ? { integration: sp.integration } : {}), ...(sp.status ? { status: sp.status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const statusStyle = (s: string) =>
    s === "SUCCESS" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : s === "FAILED" ? "bg-rose-50 text-rose-700 ring-rose-600/20"
        : "bg-amber-50 text-amber-700 ring-amber-600/20";

  return (
    <div>
      <Link href="/admin/integrations" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <ArrowLeft className="h-4 w-4" /> Back to integrations
      </Link>
      <PageHeader title="Integration logs" subtitle="Every webhook and ingestion event, newest first." />
      {logs.length === 0 ? (
        <EmptyState title="No integration events yet" description="Google, Meta and API events will appear here as they arrive." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-navy-50/60">
                <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Integration</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">External ID</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-navy-50/40">
                    <td className="px-4 py-3 whitespace-nowrap text-navy-500">{formatDateTime(l.createdAt)}</td>
                    <td className="px-4 py-3 font-medium capitalize text-navy-800">{l.integration}</td>
                    <td className="px-4 py-3 text-navy-600">{l.event}</td>
                    <td className="px-4 py-3"><Badge className={statusStyle(l.status)}>{l.status}</Badge></td>
                    <td className="px-4 py-3 text-navy-500">{l.externalId ?? "—"}</td>
                    <td className="px-4 py-3 text-navy-500">{l.message ?? "—"}</td>
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
