import Link from "next/link";
import { requireAgent } from "@/lib/guards";
import { searchAvailableLeads } from "@/lib/agent/leads";
import { getSiteSettings } from "@/lib/settings";
import { computeLeadCharge, exclusiveEligible, requiresExclusive } from "@/lib/leads/pricing";
import { PageHeader } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui";
import { LeadFiltersDrawer } from "@/components/agent/LeadFiltersDrawer";
import { AvailableLeadCard } from "@/components/agent/AvailableLeadCard";

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
          {result.items.map((l) => (
            <AvailableLeadCard
              key={l.id}
              lead={{
                id: l.id,
                destinationText: l.destinationText,
                destinationName: l.destination?.name ?? null,
                tripType: l.tripType,
                tripCategory: l.tripCategory,
                travelers: l.travelers,
                adults: l.adults,
                children: l.children,
                nights: l.nights,
                requirements: l.requirements,
                travelDate: l.travelDate,
                travelDateText: l.travelDateText,
                createdAt: l.createdAt,
                assignmentCount: l._count.assignments,
                maxAgents: l.maxAgents,
              }}
              shared={computeLeadCharge({ tripCategory: l.tripCategory, purchaseType: "SHARED", settings })}
              exclusive={{
                ...computeLeadCharge({ tripCategory: l.tripCategory, purchaseType: "EXCLUSIVE", settings }),
                eligible: exclusiveEligible(l._count.assignments),
              }}
              exclusiveOnly={requiresExclusive(l.tripCategory)}
              canBuy={canBuy}
              creditsAvailable={credits}
              owned={l.assignments.length > 0}
            />
          ))}
        </div>
        <Pagination basePath="/agent/leads" params={params} page={result.page} totalPages={result.totalPages} total={result.total} />
        </>
      )}
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
