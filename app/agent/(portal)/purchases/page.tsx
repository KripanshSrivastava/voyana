import Link from "next/link";
import { requireAgent } from "@/lib/guards";
import { searchAgentPurchases } from "@/lib/agent/leads";
import { PageHeader } from "@/components/admin/ui";
import { Badge, EmptyState, ButtonLink } from "@/components/ui";
import { formatINR, formatDate, titleCase } from "@/lib/utils";
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

export default async function PurchasesPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const { agent } = await requireAgent();
  const filters = {
    status: paramValue(searchParams, "status"),
    destination: paramValue(searchParams, "destination"),
    clientLocation: paramValue(searchParams, "clientLocation"),
    category: paramValue(searchParams, "category"),
    travelDateFrom: paramValue(searchParams, "travelDateFrom"),
    travelDateTo: paramValue(searchParams, "travelDateTo"),
    purchaseDateFrom: paramValue(searchParams, "purchaseDateFrom"),
    purchaseDateTo: paramValue(searchParams, "purchaseDateTo"),
    search: paramValue(searchParams, "search"),
    leadCode: paramValue(searchParams, "leadCode"),
    customerName: paramValue(searchParams, "customerName"),
    sort: paramValue(searchParams, "sort"),
    page: toNumber(paramValue(searchParams, "page")) ?? 1,
    limit: toNumber(paramValue(searchParams, "limit")) ?? 20,
  };
  const result = await searchAgentPurchases(agent.id, filters);
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value == null || value === "" || Number.isNaN(value)) return;
    params.set(key, String(value));
  });

  return (
    <div>
      <PageHeader title="My leads" subtitle="Leads you've purchased. Update status as you work them." />
      <LeadFiltersDrawer mode="my" values={Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, v == null ? "" : String(v)]))} count={result.total} />
      {result.items.length === 0 ? (
        <EmptyState title="No leads found" description="Try clearing filters or buy a lead from the marketplace to get started." action={<ButtonLink href="/agent/leads" variant="brand">Browse leads</ButtonLink>} />
      ) : (
        <>
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-navy-50/60">
                <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Destination</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Purchased</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {result.items.map((a) => (
                  <tr key={a.id} className="hover:bg-navy-50/40">
                    <td className="px-4 py-3 font-semibold text-navy-800">{a.lead.code}</td>
                    <td className="px-4 py-3 text-navy-700">{a.lead.destination?.name || a.lead.destinationText}</td>
                    <td className="px-4 py-3 text-navy-700">{a.lead.customerName}</td>
                    <td className="px-4 py-3 text-navy-500">{formatDate(a.purchasedAt)}</td>
                    <td className="px-4 py-3 text-navy-700">{formatINR(a.price)}</td>
                    <td className="px-4 py-3"><Badge className="bg-navy-100 text-navy-700 ring-navy-500/20">{titleCase(a.status)}</Badge></td>
                    <td className="px-4 py-3"><Link href={`/agent/leads/${a.leadId}`} className="font-medium text-brand-700 hover:underline">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination basePath="/agent/purchases" params={params} page={result.page} totalPages={result.totalPages} total={result.total} />
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
