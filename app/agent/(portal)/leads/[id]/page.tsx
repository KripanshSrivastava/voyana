import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, User, MapPin, Calendar, Users, Baby, Coins, Tag, Lock, MessageCircle } from "lucide-react";

// Defensive: forbid any router-level RSC caching on the detail page. The
// agent portal layout was serving a stale marketplace tree during client
// navigation before this was set — Next's default "auto" heuristic decided
// the parent /agent/leads segment was safe to reuse.
export const dynamic = "force-dynamic";
import { requireAgent } from "@/lib/guards";
import { getAgentLead } from "@/lib/agent/leads";
import { getSiteSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { BuyLeadControls, LeadStatusControl } from "@/components/agent/AgentControls";
import { Card, Badge, EmptyState } from "@/components/ui";
import { computeLeadCharge, exclusiveEligible, requiresExclusive, priceToCredits } from "@/lib/leads/pricing";
import { leadTravellersLabel, leadDurationLabel } from "@/lib/leads/display";
import { formatDate, parseJson } from "@/lib/utils";

export default async function AgentLeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { agent } = await requireAgent();
  const [data, settings] = await Promise.all([
    getAgentLead(agent.id, id),
    getSiteSettings(),
  ]);
  if (!data) notFound();
  const { lead, assignment, owned } = data;
  // Purchase charges are computed server-side (never trust client) via the
  // same helper the /agent/leads grid uses, so the number in the sidebar
  // matches what the purchase route will actually deduct.
  const sharedCharge = computeLeadCharge({ tripCategory: lead.tripCategory, purchaseType: "SHARED", settings });
  const exclusiveCharge = computeLeadCharge({ tripCategory: lead.tripCategory, purchaseType: "EXCLUSIVE", settings });
  // Capacity/eligibility must read the same denormalised column that
  // purchaseLead() enforces. The LeadAssignment row count under-reports for
  // exclusively-purchased leads (one row consumes every slot), which made
  // this page offer Buy buttons the server then rejected with
  // "This lead is fully distributed."
  const exclEligible = exclusiveEligible(lead.assignmentCount);
  const exclusiveOnly = requiresExclusive(lead.tripCategory);
  const requirements = parseJson<string[]>(lead.requirements, []);
  // For a lead the agent has already purchased, the header should show WHAT
  // THEY PAID at the time of purchase (assignment.price), not the current
  // template price on the Lead row — those can differ if the admin changed
  // pricing after the fact. Preview (unpurchased) leads still use lead.price
  // to advertise the current cost.
  const price = owned && assignment ? assignment.price : (lead.price ?? 0);
  const priceCredits = priceToCredits(price);
  const full = lead.assignmentCount >= lead.maxAgents;
  const credits = agent.creditBalance?.balance ?? 0;
  const whatsapp = lead.phone.replace(/[^\d]/g, "");
  const travellers = leadTravellersLabel({ travelers: lead.travelers, adults: lead.adults, children: lead.children });
  const duration = leadDurationLabel({ nights: lead.nights, requirements });

  return (
    <div>
      <Link href="/agent/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>
      <PageHeader
        title={lead.code}
        subtitle={owned ? "You have access to this lead." : "Preview - purchase to unlock contact details."}
        action={<Badge className="bg-navy-100 text-navy-700 ring-navy-500/20">{lead.assignmentCount}/{lead.maxAgents} sold</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Trip details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail icon={<MapPin className="h-4 w-4" />} label="Destination" value={lead.destination?.name || lead.destinationText} />
              <Detail icon={<MapPin className="h-4 w-4" />} label="Client location" value={lead.clientLocation || lead.departureCity || "-"} />
              <Detail icon={<Calendar className="h-4 w-4" />} label="Travel date" value={lead.travelDate ? formatDate(lead.travelDate) : lead.travelDateText || "Flexible"} />
              {/* Break out adults + children so agents can size the trip at a glance —
                  a "family of 4" enquiry with 2 children needs different quoting than
                  "4 adults". Falls back to the raw traveller count when the split
                  isn't captured. */}
              <Detail icon={<Users className="h-4 w-4" />} label="Adults" value={lead.adults != null ? String(lead.adults) : (travellers ? travellers : "-")} />
              <Detail icon={<Baby className="h-4 w-4" />} label="Children" value={lead.children != null ? String(lead.children) : "0"} />
              {duration && <Detail icon={<Calendar className="h-4 w-4" />} label="Duration" value={duration} />}
              <Detail icon={<Tag className="h-4 w-4" />} label="Trip category" value={lead.tripCategory || "-"} />
              <Detail icon={<Tag className="h-4 w-4" />} label="Trip type" value={lead.tripType || "-"} />
              {/* Header cost line — owned leads show what the agent actually paid;
                  unowned leads show the current shared-purchase rate so the
                  number aligns with the primary Buy button in the sidebar. */}
              <Detail
                icon={<Coins className="h-4 w-4" />}
                label={owned ? "You paid" : "Lead cost (Shared)"}
                value={`${(owned ? priceCredits : sharedCharge.credits).toLocaleString("en-IN")} Credit${(owned ? priceCredits : sharedCharge.credits) === 1 ? "" : "s"}`}
              />
            </div>
            {requirements.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {requirements.map((r) => (<span key={r} className="rounded-full bg-navy-50 px-3 py-1 text-sm text-navy-700">{r}</span>))}
              </div>
            )}
            {lead.message && <p className="mt-4 rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-700">{lead.message}</p>}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Customer contact</h2>
            {owned ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Detail icon={<User className="h-4 w-4" />} label="Name" value={lead.customerName} />
                <Detail icon={<Phone className="h-4 w-4" />} label="Phone" value={lead.phone} />
                <Detail icon={<Mail className="h-4 w-4" />} label="Email" value={lead.email || "-"} />
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-navy-200 bg-navy-50/50 py-10 text-center">
                <Lock className="h-7 w-7 text-navy-300" />
                <p className="mt-2 text-sm text-navy-500">Phone and email are locked until you purchase this lead.</p>
              </div>
            )}
            {owned && (
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"><Phone className="h-4 w-4" /> Call</a>
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                {lead.email && <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-2 rounded-full border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50"><Mail className="h-4 w-4" /> Email</a>}
              </div>
            )}
          </Card>

          {owned && lead.notes.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 font-semibold text-navy-900">Notes from admin</h2>
              <div className="space-y-2">
                {lead.notes.map((n) => (<p key={n.id} className="rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-700">{n.body}</p>))}
              </div>
            </Card>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            {owned ? (
              <>
                <h2 className="mb-4 font-semibold text-navy-900">Update status</h2>
                <LeadStatusControl leadId={lead.id} current={assignment!.status} />
                <p className="mt-3 text-xs text-navy-400">
                  Purchased with {priceToCredits(assignment!.price).toLocaleString("en-IN")} Credit{priceToCredits(assignment!.price) === 1 ? "" : "s"} on {formatDate(assignment!.purchasedAt)}.
                </p>
              </>
            ) : (
              <>
                <div className="mb-1 text-sm text-navy-500">Purchase options</div>
                <div className="mb-3 flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl font-bold text-navy-900">
                    {sharedCharge.credits.toLocaleString("en-IN")} Cr
                  </span>
                  <span className="text-xs uppercase tracking-wide text-navy-400">Shared</span>
                  <span className="text-navy-300">·</span>
                  <span className="text-2xl font-bold text-navy-900">
                    {exclusiveCharge.credits.toLocaleString("en-IN")} Cr
                  </span>
                  <span className="text-xs uppercase tracking-wide text-navy-400">Exclusive</span>
                </div>
                <BuyLeadControls
                  leadId={lead.id}
                  shared={{ priceInr: sharedCharge.priceInr, credits: sharedCharge.credits }}
                  exclusive={{ priceInr: exclusiveCharge.priceInr, credits: exclusiveCharge.credits, eligible: exclEligible }}
                  exclusiveOnly={exclusiveOnly}
                  disabled={agent.status !== "APPROVED" || full}
                  disabledReason={agent.status !== "APPROVED" ? "Account not approved" : full ? "Fully distributed" : undefined}
                  creditsAvailable={credits}
                />
                <p className="mt-3 text-xs text-navy-400">Lead Credits: {credits.toLocaleString("en-IN")}</p>
                {credits === 0 && <Link href="/agent/wallet" className="mt-3 inline-flex text-sm font-semibold text-brand-700 hover:underline">Buy Lead Credits</Link>}
              </>
            )}
          </Card>
        </aside>
      </div>

      {full && !owned && (
        <div className="mt-6"><EmptyState title="Lead fully distributed" description="This lead has reached its maximum of 2 agents." /></div>
      )}
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-navy-400">{icon}</span>
      <div><div className="text-xs text-navy-400">{label}</div><div className="font-medium text-navy-800">{value}</div></div>
    </div>
  );
}
