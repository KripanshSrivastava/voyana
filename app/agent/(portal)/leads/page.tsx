import Link from "next/link";
import { MapPin, Calendar, Users, IndianRupee, Tag, Lock } from "lucide-react";
import { requireAgent } from "@/lib/guards";
import { searchAvailableLeads } from "@/lib/agent/leads";
import { getSiteSettings } from "@/lib/settings";
import { computeLeadCharge, exclusiveEligible, requiresExclusive } from "@/lib/leads/pricing";
import { PageHeader } from "@/components/admin/ui";
import { BuyLeadControls } from "@/components/agent/AgentControls";
import { Badge, EmptyState } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/utils";
import { LeadFiltersDrawer } from "@/components/agent/LeadFiltersDrawer";

function paramValue(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value ?? "";
}

function toNumber(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pageLink(path: string, params: URLSearchParams, nextPage: number) {
  const next = new URLSearchParams(params.toString());
  next.set("page", String(nextPage));
  return `${path}?${next.toString()}`;
}

export default async function AgentLeadsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { agent } = await requireAgent();
  const sp = await searchParams;
  const filters = {
    destination: paramValue(sp, "destination"),
    clientLocation: paramValue(sp, "clientLocation"),
    category: paramValue(sp, "category"),
    tripType: paramValue(sp, "tripType"),
    minTravelers: toNumber(paramValue(sp, "minTravelers")),
    maxTravelers: toNumber(paramValue(sp, "maxTravelers")),
    travelDateFrom: paramValue(sp, "travelDateFrom"),
    travelDateTo: paramValue(sp, "travelDateTo"),
    search: paramValue(sp, "search"),
    sort: paramValue(sp, "sort"),
    page: toNumber(paramValue(sp, "page")) ?? 1,
    limit: toNumber(paramValue(sp, "limit")) ?? 20,
  };
  const [result, settings] = await Promise.all([
    searchAvailableLeads(agent.id, filters),
    getSiteSettings(),
  ]);
  const canBuy = agent.status === "APPROVED";
  const credits = agent.creditBalance?.balance ?? 0;
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value == null || value === "" || Number.isNaN(value)) return;
    params.set(key, String(value));
  });

  return (
    <div>
      <PageHeader title="Available leads" subtitle="Preview matching leads. Buy Shared to add the lead to your marketplace, or Buy Exclusive to lock it to you alone." />
      <div className="mb-5 rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm font-semibold text-navy-800 shadow-sm">
        Lead Credits: {credits.toLocaleString("en-IN")}
        {credits === 0 && <Link href="/agent/wallet" className="ml-3 text-brand-700 hover:underline">Buy Credits</Link>}
      </div>
      <LeadFiltersDrawer mode="available" values={Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, v == null ? "" : String(v)]))} count={result.total} />

      {result.items.length === 0 ? (
        <EmptyState title="No leads found" description="Try clearing filters or check back later for new qualified leads." />
      ) : (
        <>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((l) => {
            const shared = computeLeadCharge({ tripCategory: l.tripCategory, purchaseType: "SHARED", settings });
            const exclusive = computeLeadCharge({ tripCategory: l.tripCategory, purchaseType: "EXCLUSIVE", settings });
            const full = l._count.assignments >= l.maxAgents;
            const canExclusive = exclusiveEligible(l._count.assignments);
            const exclusiveOnly = requiresExclusive(l.tripCategory);
            const isIntl = l.tripCategory === "INTERNATIONAL";
            return (
              <div key={l.id} className="flex flex-col rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <Link href={`/agent/leads/${l.id}`} className="text-sm font-semibold text-brand-700 hover:underline">{l.code}</Link>
                  <Badge className={isIntl ? "bg-brand-50 text-brand-700 ring-brand-500/20" : "bg-navy-100 text-navy-700 ring-navy-500/20"}>
                    {isIntl ? "International Lead" : l.tripCategory ? `${l.tripCategory.charAt(0)}${l.tripCategory.slice(1).toLowerCase()} Lead` : "Trip"}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <Row icon={<MapPin className="h-4 w-4" />} label="Destination" value={l.destination?.name || l.destinationText} />
                  <Row icon={<Calendar className="h-4 w-4" />} label="Travel" value={l.travelDate ? formatDate(l.travelDate) : l.travelDateText || "Flexible"} />
                  <Row icon={<Users className="h-4 w-4" />} label="Travelers" value={l.travelers?.toString() || "—"} />
                  <Row icon={<IndianRupee className="h-4 w-4" />} label="Budget" value={l.budget ? formatINR(l.budget) : "—"} />
                  <Row icon={<Tag className="h-4 w-4" />} label="Trip type" value={l.tripType || "—"} />
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-500">
                  <Lock className="h-3.5 w-3.5" /> Contact details unlock after purchase
                </div>

                <div className="mt-3">
                  <Badge className={full ? "bg-rose-50 text-rose-700 ring-rose-600/20" : "bg-teal-50 text-teal-700 ring-teal-600/20"}>
                    {l._count.assignments}/{l.maxAgents} sold
                  </Badge>
                </div>

                {credits === 0 ? (
                  <Link href="/agent/wallet" className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
                    Buy Lead Credits
                  </Link>
                ) : (
                  <BuyLeadControls
                    leadId={l.id}
                    className="mt-4"
                    shared={{ priceInr: shared.priceInr, credits: shared.credits }}
                    exclusive={{ priceInr: exclusive.priceInr, credits: exclusive.credits, eligible: canExclusive }}
                    exclusiveOnly={exclusiveOnly}
                    disabled={!canBuy || full}
                    disabledReason={!canBuy ? "Account not approved" : full ? "Fully distributed" : undefined}
                    creditsAvailable={credits}
                  />
                )}
              </div>
            );
          })}
        </div>
        <Pagination basePath="/agent/leads" params={params} page={result.page} totalPages={result.totalPages} total={result.total} />
        </>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-navy-400">{icon} {label}</span>
      <span className="font-medium text-navy-800">{value}</span>
    </div>
  );
}

function Pagination({ basePath, params, page, totalPages, total }: { basePath: string; params: URLSearchParams; page: number; totalPages: number; total: number }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-500 shadow-sm">
      <span>{total.toLocaleString("en-IN")} total</span>
      <div className="flex items-center gap-2">
        <Link className={page <= 1 ? "pointer-events-none opacity-50" : "hover:text-brand-700"} href={pageLink(basePath, params, Math.max(1, page - 1))}>Previous</Link>
        <span className="text-navy-400">Page {page} of {totalPages}</span>
        <Link className={page >= totalPages ? "pointer-events-none opacity-50" : "hover:text-brand-700"} href={pageLink(basePath, params, Math.min(totalPages, page + 1))}>Next</Link>
      </div>
    </div>
  );
}
