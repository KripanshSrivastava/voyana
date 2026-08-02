import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, User, MapPin, Calendar, Users, IndianRupee, Tag, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { PageHeader, StatusBadge, QualityBadge } from "@/components/admin/ui";
import { LeadActions } from "@/components/admin/LeadActions";
import { Badge, Card } from "@/components/ui";
import { formatINR, formatDate, formatDateTime, parseJson, titleCase } from "@/lib/utils";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, settings] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        assignments: { include: { agent: { include: { user: true } } }, orderBy: { purchasedAt: "asc" } },
        notes: { orderBy: { createdAt: "desc" } },
        statusHistory: { orderBy: { createdAt: "desc" } },
        destination: true,
        package: true,
        duplicateOf: { select: { id: true, code: true } },
      },
    }),
    getSiteSettings(),
  ]);
  if (!lead) notFound();

  const requirements = parseJson<string[]>(lead.requirements, []);
  const assignedAgentIds = new Set(lead.assignments.map((a) => a.agentId));
  const approvedAgents = await prisma.agent.findMany({
    where: { status: "APPROVED", id: { notIn: [...assignedAgentIds] } },
    include: { user: true, wallet: true },
  });
  const capacityFull = lead.assignments.length >= lead.maxAgents;

  const attribution: [string, string | null][] = [
    ["Source", lead.source], ["Source type", lead.sourceType],
    ["UTM source", lead.utmSource], ["UTM medium", lead.utmMedium], ["Campaign", lead.utmCampaign],
    ["Term", lead.utmTerm], ["Content", lead.utmContent],
    ["GCLID", lead.gclid], ["GBRAID", lead.gbraid], ["WBRAID", lead.wbraid], ["FBCLID", lead.fbclid],
    ["Campaign ID", lead.campaignId], ["Ad group", lead.adGroupId], ["Keyword", lead.keyword], ["Creative", lead.creativeId],
    ["Device", lead.device], ["Referrer", lead.referrer], ["Landing page", lead.landingPage],
    ["First page", lead.firstPage], ["Last page", lead.lastPage],
  ];

  return (
    <div>
      <Link href="/admin/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>
      <PageHeader
        title={lead.code}
        subtitle={`Captured ${formatDateTime(lead.createdAt)}`}
        action={
          <div className="flex items-center gap-2">
            {lead.isDuplicate && <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Potential duplicate</Badge>}
            <QualityBadge quality={lead.quality} />
            <StatusBadge status={lead.status} />
          </div>
        }
      />

      {lead.duplicateOf && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>Possible duplicate of an earlier lead.</span>
          <Link href={`/admin/leads/${lead.duplicateOf.id}`} className="font-semibold underline">View {lead.duplicateOf.code}</Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          {/* Customer + trip */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-navy-900">Customer &amp; trip</h2>
              <Link href={`/admin/leads/${lead.id}/edit`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                <Pencil className="h-3.5 w-3.5" /> Edit details
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail icon={<User className="h-4 w-4" />} label="Name" value={lead.customerName} />
              <Detail icon={<Phone className="h-4 w-4" />} label="Phone" value={lead.phone} />
              <Detail icon={<Mail className="h-4 w-4" />} label="Email" value={lead.email || "—"} />
              <Detail icon={<MapPin className="h-4 w-4" />} label="Destination" value={lead.destinationText} />
              <Detail icon={<MapPin className="h-4 w-4" />} label="Departure" value={lead.departureCity || "—"} />
              <Detail icon={<Calendar className="h-4 w-4" />} label="Travel date" value={lead.travelDate ? formatDate(lead.travelDate) : lead.travelDateText || "—"} />
              <Detail icon={<Users className="h-4 w-4" />} label="Travelers" value={lead.travelers?.toString() || "—"} />
              <Detail icon={<IndianRupee className="h-4 w-4" />} label="Budget" value={lead.budget ? formatINR(lead.budget) : "—"} />
              <Detail icon={<Tag className="h-4 w-4" />} label="Trip type" value={lead.tripType || "—"} />
              <Detail icon={<Tag className="h-4 w-4" />} label="Quality score" value={lead.qualityScore != null ? `${lead.qualityScore}/100` : "—"} />
            </div>
            {requirements.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-navy-400">Requirements</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {requirements.map((r) => (<span key={r} className="rounded-full bg-navy-50 px-3 py-1 text-sm text-navy-700">{r}</span>))}
                </div>
              </div>
            )}
            {lead.message && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-navy-400">Message</p>
                <p className="mt-1 text-navy-700">{lead.message}</p>
              </div>
            )}
            {(lead.destination || lead.packageSnapshotName) && (
              <div className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                {lead.destination && <>Interested destination: <strong>{lead.destination.name}</strong>. </>}
                {lead.packageSnapshotName && <>Interested package: <strong>{lead.packageSnapshotName}</strong>{lead.packageSnapshotPrice ? ` (${formatINR(lead.packageSnapshotPrice)})` : ""}.</>}
              </div>
            )}
          </Card>

          {/* Assigned agents */}
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy-900">
              Distribution <span className="text-sm font-normal text-navy-400">({lead.assignments.length}/{lead.maxAgents})</span>
            </h2>
            {lead.assignments.length === 0 ? (
              <p className="text-sm text-navy-400">Not yet distributed to any agent.</p>
            ) : (
              <div className="space-y-3">
                {lead.assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-navy-100 px-4 py-3">
                    <div>
                      <div className="font-medium text-navy-800">{a.agent.companyName}</div>
                      <div className="text-xs text-navy-400">{a.agent.user.name} · {a.agent.phone}</div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-navy-100 text-navy-700 ring-navy-500/20">{titleCase(a.status)}</Badge>
                      <div className="mt-1 text-sm font-semibold text-navy-900">{formatINR(a.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {capacityFull && <p className="mt-3 text-sm font-medium text-rose-600">Lead fully distributed.</p>}
          </Card>

          {/* Attribution */}
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Marketing attribution</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {attribution.filter(([, v]) => v).length === 0 ? (
                <p className="text-sm text-navy-400">Direct / no attribution captured.</p>
              ) : (
                attribution.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="text-sm">
                    <span className="text-navy-400">{k}: </span>
                    <span className="break-all font-medium text-navy-700">{v}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Timeline</h2>
            <ol className="space-y-3 border-l-2 border-navy-100 pl-5">
              {lead.statusHistory.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-brand-500" />
                  <div className="text-sm text-navy-800">{h.note || `Status → ${titleCase(h.toStatus)}`}</div>
                  <div className="text-xs text-navy-400">{formatDateTime(h.createdAt)} · {titleCase(h.actorType)}{h.actorLabel ? ` (${h.actorLabel})` : ""}</div>
                </li>
              ))}
            </ol>
          </Card>

          {/* Notes */}
          {lead.notes.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 font-semibold text-navy-900">Notes</h2>
              <div className="space-y-3">
                {lead.notes.map((n) => (
                  <div key={n.id} className="rounded-lg bg-navy-50 px-4 py-3">
                    <p className="text-sm text-navy-800">{n.body}</p>
                    <p className="mt-1 text-xs text-navy-400">{n.authorLabel} · {formatDateTime(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Actions */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Manage lead</h2>
            <LeadActions
              id={lead.id}
              status={lead.status}
              quality={lead.quality}
              price={lead.price}
              defaultPrice={settings.defaultLeadPrice}
              capacityFull={capacityFull}
              agents={approvedAgents.map((a) => ({
                id: a.id,
                label: `${a.companyName} · ${formatINR(a.wallet?.balance ?? 0)}`,
              }))}
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-navy-400">{icon}</span>
      <div>
        <div className="text-xs text-navy-400">{label}</div>
        <div className="font-medium text-navy-800">{value}</div>
      </div>
    </div>
  );
}
