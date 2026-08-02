import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { requireArea } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/ui";
import { Card, Badge, Input, Select, Button } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/utils";

function v(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value ?? "";
}

function num(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function VendorAdsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireAdmin();
  requireArea(session, "marketing");
  const resolvedSearchParams = await searchParams;

  const filters = {
    status: v(resolvedSearchParams, "status"),
    vendor: v(resolvedSearchParams, "vendor"),
    destination: v(resolvedSearchParams, "destination"),
    clientLocation: v(resolvedSearchParams, "clientLocation"),
    category: v(resolvedSearchParams, "category"),
    search: v(resolvedSearchParams, "search"),
    from: v(resolvedSearchParams, "from"),
    to: v(resolvedSearchParams, "to"),
    page: num(v(resolvedSearchParams, "page")) ?? 1,
    limit: num(v(resolvedSearchParams, "limit")) ?? 20,
  };

  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.vendor) where.agent = { OR: [{ companyName: { contains: filters.vendor, mode: "insensitive" } }, { user: { name: { contains: filters.vendor, mode: "insensitive" } } }] };
  if (filters.destination) where.destination = { contains: filters.destination, mode: "insensitive" };
  if (filters.clientLocation) where.clientLocation = { contains: filters.clientLocation, mode: "insensitive" };
  if (filters.category) where.category = filters.category;
  if (filters.search) where.OR = [{ title: { contains: filters.search, mode: "insensitive" } }, { description: { contains: filters.search, mode: "insensitive" } }];
  if (filters.from || filters.to) where.createdAt = { gte: filters.from ? new Date(filters.from) : undefined, lte: filters.to ? new Date(filters.to) : undefined };

  const [total, items] = await Promise.all([
    prisma.vendorAd.count({ where: where as never }),
    prisma.vendorAd.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      include: { agent: { include: { user: true } } },
    }),
  ]);

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value == null || value === "") return;
    params.set(key, String(value));
  });

  return (
    <div>
      <PageHeader title="Vendor ads" subtitle="Review, approve, pause and reject paid vendor campaigns." />
      <FilterBar searchParams={resolvedSearchParams} />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-navy-50/60 text-left text-xs uppercase tracking-wide text-navy-400">
              <tr>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Destination</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Budget</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {items.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-navy-500" colSpan={8}>No vendor ads found.</td></tr>
              ) : items.map((ad) => (
                <tr key={ad.id} className="hover:bg-navy-50/40">
                  <td className="px-4 py-3 text-navy-700">{ad.agent.companyName}</td>
                  <td className="px-4 py-3 font-medium text-brand-700"><Link href={`/admin/vendor-ads/${ad.id}`}>{ad.title}</Link></td>
                  <td className="px-4 py-3 text-navy-700">{ad.destination || "—"}</td>
                  <td className="px-4 py-3 text-navy-700">{ad.category ? titleCase(ad.category) : "—"}</td>
                  <td className="px-4 py-3 text-navy-700">{ad.dailyBudget ? `₹${ad.dailyBudget.toLocaleString("en-IN")}` : "—"}</td>
                  <td className="px-4 py-3 text-navy-500">{[ad.startDate ? formatDate(ad.startDate) : null, ad.endDate ? formatDate(ad.endDate) : null].filter(Boolean).join(" → ") || "—"}</td>
                  <td className="px-4 py-3"><Badge className={ad.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : ad.status === "REJECTED" ? "bg-rose-50 text-rose-700 ring-rose-600/20" : ad.status === "PAUSED" ? "bg-amber-50 text-amber-700 ring-amber-600/20" : "bg-slate-100 text-slate-600 ring-slate-500/20"}>{titleCase(ad.status)}</Badge></td>
                  <td className="px-4 py-3"><Link href={`/admin/vendor-ads/${ad.id}`} className="font-medium text-brand-700 hover:underline">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination basePath="/admin/vendor-ads" params={params} page={filters.page} totalPages={Math.max(1, Math.ceil(total / filters.limit))} total={total} />
    </div>
  );
}

function FilterBar({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const action = "/admin/vendor-ads";
  return (
    <form method="get" action={action} className="mb-5 grid gap-3 rounded-2xl border border-navy-100 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-6">
      <Input name="search" defaultValue={v(searchParams, "search")} placeholder="Search campaign / creative" />
      <Input name="vendor" defaultValue={v(searchParams, "vendor")} placeholder="Vendor" />
      <Input name="destination" defaultValue={v(searchParams, "destination")} placeholder="Destination" />
      <Input name="clientLocation" defaultValue={v(searchParams, "clientLocation")} placeholder="Client location" />
      <Input name="from" type="date" defaultValue={v(searchParams, "from")} />
      <Input name="to" type="date" defaultValue={v(searchParams, "to")} />
      <Select name="status" defaultValue={v(searchParams, "status")}>
        <option value="">All statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="PAUSED">Paused</option>
        <option value="EXPIRED">Expired</option>
      </Select>
      <div className="xl:col-span-6 flex gap-2">
        <Button type="submit" variant="brand">Filter</Button>
        <Link href={action} className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-navy-700 hover:bg-navy-50">Clear</Link>
      </div>
    </form>
  );
}

function Pagination({ basePath, params, page, totalPages, total }: { basePath: string; params: URLSearchParams; page: number; totalPages: number; total: number }) {
  if (totalPages <= 1) return null;
  const link = (nextPage: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(nextPage));
    return `${basePath}?${next.toString()}`;
  };
  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-500 shadow-sm">
      <span>{total.toLocaleString("en-IN")} total</span>
      <div className="flex items-center gap-2">
        <Link className={page <= 1 ? "pointer-events-none opacity-50" : "hover:text-brand-700"} href={link(Math.max(1, page - 1))}>Previous</Link>
        <span className="text-navy-400">Page {page} of {totalPages}</span>
        <Link className={page >= totalPages ? "pointer-events-none opacity-50" : "hover:text-brand-700"} href={link(Math.min(totalPages, page + 1))}>Next</Link>
      </div>
    </div>
  );
}
