import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getFlags } from "@/lib/flags";
import { getSiteSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { Card, Badge, EmptyState } from "@/components/ui";
import { AdForm, type AdTargetOption } from "@/components/agent/AdForm";
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

  // Fetch the vendor's own approved destinations and packages/tours; those
  // are the ONLY things they can advertise. `select` keeps the payload small
  // and shape stable for the client component.
  const [ads, destinations, packages, settings] = await Promise.all([
    prisma.vendorAd.findMany({ where: { agentId: agent.id }, orderBy: { createdAt: "desc" } }),
    prisma.destination.findMany({
      where: { submittedByAgentId: agent.id, moderationStatus: "APPROVED" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.tourPackage.findMany({
      where: { submittedByAgentId: agent.id, moderationStatus: "APPROVED" },
      select: { id: true, title: true, kind: true },
      orderBy: { title: "asc" },
    }),
    getSiteSettings(),
  ]);

  const targets: AdTargetOption[] = [
    ...destinations.map((d) => ({ key: `DESTINATION:${d.id}`, type: "DESTINATION" as const, id: d.id, label: `Destination · ${d.name}` })),
    ...packages.map((p) => ({
      key: `${p.kind}:${p.id}`,
      type: (p.kind === "TOUR" ? "TOUR" : "PACKAGE") as "TOUR" | "PACKAGE",
      id: p.id,
      label: `${p.kind === "TOUR" ? "Tour" : "Package"} · ${p.title}`,
    })),
  ];

  const cpc = settings.adCostPerClickCredits ?? 10;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="My Ads" subtitle={`Promote your destinations, tours and packages. Each click costs ${cpc} Credit${cpc === 1 ? "" : "s"}.`} />
      <AdForm targets={targets} adCostPerClickCredits={cpc} />
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-navy-900">Your ads</h2>
        {ads.length === 0 ? (
          <EmptyState title="No ads yet" description="Create your first advertisement above." />
        ) : (
          <div className="divide-y divide-navy-50">
            {ads.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-navy-800">{a.title}</div>
                  <div className="truncate text-xs text-navy-400">
                    {[a.destination, a.targetType && titleCase(a.targetType.toLowerCase())].filter(Boolean).join(" · ")}
                    {" · "}Created {formatDate(a.createdAt)} · {a.impressions} impressions · {a.clicks} clicks · {cpc} Credit{cpc === 1 ? "" : "s"} / click
                  </div>
                </div>
                <Badge className={VERIFICATION_STATUS_STYLES[a.status === "APPROVED" ? "VERIFIED" : a.status === "REJECTED" ? "REJECTED" : "UNDER_REVIEW"] ?? ""}>
                  {titleCase(a.status)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
