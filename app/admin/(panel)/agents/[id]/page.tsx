import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader, StatCard, AgentStatusBadge } from "@/components/admin/ui";
import { AgentStatusActions, VerificationActions, WalletCredit } from "@/components/admin/AgentActions";
import { Card, Badge } from "@/components/ui";
import { formatINR, formatDateTime, titleCase } from "@/lib/utils";
import { VERIFICATION_STATUS_STYLES } from "@/lib/constants";
import { BadgeCheck } from "lucide-react";

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      user: true,
      wallet: { include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } },
      assignments: { include: { lead: true }, orderBy: { purchasedAt: "desc" } },
    },
  });
  if (!agent) notFound();

  const totalSpent = agent.assignments.reduce((s, a) => s + a.price, 0);
  const won = agent.assignments.filter((a) => a.status === "WON").length;

  return (
    <div>
      <Link href="/admin/agents" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <ArrowLeft className="h-4 w-4" /> Back to agents
      </Link>
      <PageHeader
        title={agent.companyName}
        subtitle={`${agent.user.name} · ${agent.user.email} · ${agent.phone}`}
        action={
          <div className="flex items-center gap-2">
            {agent.verificationStatus === "VERIFIED" && (
              <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20"><BadgeCheck className="mr-1 h-3.5 w-3.5" /> Verified</Badge>
            )}
            <AgentStatusBadge status={agent.status} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Wallet balance" value={formatINR(agent.wallet?.balance ?? 0)} accent="brand" />
        <StatCard label="Total spent" value={formatINR(totalSpent)} accent="navy" />
        <StatCard label="Leads purchased" value={agent.assignments.length} accent="sun" />
        <StatCard label="Won" value={won} accent="emerald" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Purchased leads</h2>
            {agent.assignments.length === 0 ? (
              <p className="text-sm text-navy-400">No purchases yet.</p>
            ) : (
              <div className="overflow-x-auto scroll-slim">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-navy-100 text-left text-xs uppercase text-navy-400">
                      <th className="py-2 pr-4 font-medium">Lead</th>
                      <th className="py-2 pr-4 font-medium">Destination</th>
                      <th className="py-2 pr-4 font-medium">Price</th>
                      <th className="py-2 pr-4 font-medium">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50">
                    {agent.assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 pr-4">
                          <Link href={`/admin/leads/${a.leadId}`} className="font-medium text-brand-700 hover:underline">{a.lead.code}</Link>
                        </td>
                        <td className="py-2.5 pr-4 text-navy-700">{a.lead.destinationText}</td>
                        <td className="py-2.5 pr-4 text-navy-700">{formatINR(a.price)}</td>
                        <td className="py-2.5 pr-4"><Badge className="bg-navy-100 text-navy-700 ring-navy-500/20">{titleCase(a.status)}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Wallet history</h2>
            {agent.wallet?.transactions.length === 0 ? (
              <p className="text-sm text-navy-400">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {agent.wallet?.transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-navy-50 py-2 text-sm last:border-0">
                    <div>
                      <div className="text-navy-700">{t.description}</div>
                      <div className="text-xs text-navy-400">{formatDateTime(t.createdAt)}</div>
                    </div>
                    <div className={t.type === "CREDIT" ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>
                      {t.type === "CREDIT" ? "+" : "−"}{formatINR(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-navy-900">Verification</h2>
              <Badge className={VERIFICATION_STATUS_STYLES[agent.verificationStatus] ?? ""}>{titleCase(agent.verificationStatus)}</Badge>
            </div>
            <VerificationActions id={agent.id} status={agent.verificationStatus} notes={agent.verificationNotes} />
            {agent.verifiedAt && <p className="mt-3 text-xs text-navy-400">Verified {formatDateTime(agent.verifiedAt)}</p>}
          </Card>
          <Card className="p-6">
            <h2 className="mb-3 font-semibold text-navy-900">Company details</h2>
            <dl className="space-y-1.5 text-sm">
              {[["Company email", agent.companyEmail], ["Website", agent.website], ["State", agent.state], ["City", agent.city], ["Address", agent.companyAddress], ["Contact person", agent.contactPerson], ["Contact no", agent.contactNo]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-navy-400">{k}</dt><dd className="text-right font-medium text-navy-700">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Account status</h2>
            <AgentStatusActions id={agent.id} status={agent.status} />
            <p className="mt-3 text-xs text-navy-400">Only approved agents can purchase leads.</p>
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Adjust wallet</h2>
            <WalletCredit agentId={agent.id} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
