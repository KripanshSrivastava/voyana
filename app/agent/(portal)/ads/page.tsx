import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getFlags } from "@/lib/flags";
import { PageHeader } from "@/components/admin/ui";
import { Card, Badge, EmptyState } from "@/components/ui";
import { AdForm } from "@/components/agent/AdForm";
import { formatDate, titleCase } from "@/lib/utils";
import { VERIFICATION_STATUS_STYLES } from "@/lib/constants";

export default async function AgentAdsPage() {
  const { agent } = await requireAgent();
  const flags = await getFlags();
  if (!flags.vendorAdsEnabled) {
    return (
      <div>
        <PageHeader title="My Ads" subtitle="Promote your packages to travellers." />
        <Card className="p-6 text-sm text-navy-500">Vendor advertising isn&apos;t available yet. The Moksh Booking team will enable it soon.</Card>
      </div>
    );
  }
  const ads = await prisma.vendorAd.findMany({ where: { agentId: agent.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="My Ads" subtitle="Create and track your advertising campaigns." />
      <AdForm />
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-navy-900">Your ads</h2>
        {ads.length === 0 ? (
          <EmptyState title="No ads yet" description="Create your first advertisement above." />
        ) : (
          <div className="divide-y divide-navy-50">
            {ads.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-navy-800">{a.title}</div>
                  <div className="text-xs text-navy-400">{[a.destination, a.category && titleCase(a.category)].filter(Boolean).join(" · ")} · {formatDate(a.createdAt)} · {a.impressions} impressions · {a.clicks} clicks</div>
                </div>
                <Badge className={VERIFICATION_STATUS_STYLES[a.status === "APPROVED" ? "VERIFIED" : a.status === "REJECTED" ? "REJECTED" : "UNDER_REVIEW"] ?? ""}>{titleCase(a.status)}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
