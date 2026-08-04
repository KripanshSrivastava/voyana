"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Filter, Loader2, X } from "lucide-react";
import { Button, Input, Select, Card } from "@/components/ui";
import { TRIP_CATEGORIES, ASSIGNMENT_STATUSES } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

type LeadFiltersDrawerProps = {
  mode: "available" | "my";
  values: Record<string, string>;
  count: number;
};

function clean(value?: string) {
  return value?.trim() ?? "";
}

export function LeadFiltersDrawer({ mode, values, count }: LeadFiltersDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isAvailable = mode === "available";

  const defaults = useMemo(() => values, [values]);

  function apply(formData: FormData) {
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string") continue;
      const v = value.trim();
      if (v) params.set(key, v);
    }
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
      setOpen(false);
    });
  }

  function clearAll() {
    startTransition(() => {
      router.push(pathname);
      setOpen(false);
    });
  }

  return (
    <div className="mb-5 space-y-3 rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply(new FormData(e.currentTarget));
          }}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-3"
        >
          <Input name="search" defaultValue={clean(defaults.search)} placeholder="Search leads" className="min-w-[220px] flex-1" />
          <Button type="button" variant="outline" onClick={() => setOpen((s) => !s)}>
            <Filter className="h-4 w-4" /> Filters
          </Button>
          <Button type="submit" variant="brand" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
          <Button type="button" variant="ghost" onClick={clearAll}>
            Clear filters
          </Button>
        </form>
        <div className="ml-auto text-sm text-navy-500">{count.toLocaleString("en-IN")} result{count === 1 ? "" : "s"}</div>
      </div>

      {open && (
        <Card className="relative border-navy-100 bg-navy-50/40 p-4">
          <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 text-navy-400 hover:text-navy-700">
            <X className="h-4 w-4" />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Input name="search" defaultValue={clean(defaults.search)} placeholder="Search" />
              <Input name="destination" defaultValue={clean(defaults.destination)} placeholder="Destination" />
              <Input name="clientLocation" defaultValue={clean(defaults.clientLocation)} placeholder="Client location" />
              <Select name="category" defaultValue={clean(defaults.category)}>
                <option value="">All trip categories</option>
                {TRIP_CATEGORIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
              </Select>
              <Input name="tripType" defaultValue={clean(defaults.tripType)} placeholder="Trip type" />
              <Input name="minTravelers" type="number" defaultValue={clean(defaults.minTravelers)} placeholder="Min travelers" />
              <Input name="maxTravelers" type="number" defaultValue={clean(defaults.maxTravelers)} placeholder="Max travelers" />
              <Input name="travelDateFrom" type="date" defaultValue={clean(defaults.travelDateFrom)} />
              <Input name="travelDateTo" type="date" defaultValue={clean(defaults.travelDateTo)} />
              {!isAvailable && <>
                <Select name="status" defaultValue={clean(defaults.status)}>
                  <option value="">All statuses</option>
                  {ASSIGNMENT_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                </Select>
                <Input name="leadCode" defaultValue={clean(defaults.leadCode)} placeholder="Lead code" />
                <Input name="customerName" defaultValue={clean(defaults.customerName)} placeholder="Customer name" />
                <Input name="purchaseDateFrom" type="date" defaultValue={clean(defaults.purchaseDateFrom)} />
                <Input name="purchaseDateTo" type="date" defaultValue={clean(defaults.purchaseDateTo)} />
              </>}
              <Select name="sort" defaultValue={clean(defaults.sort)}>
                <option value="">Newest first</option>
                <option value="oldest">Oldest</option>
                <option value="price_asc">Price low to high</option>
                <option value="price_desc">Price high to low</option>
                <option value="travel_asc">Travel date ascending</option>
                <option value="travel_desc">Travel date descending</option>
                <option value="quality_desc">Quality high to low</option>
                {!isAvailable && <option value="status">Status</option>}
                {!isAvailable && <option value="destination">Destination</option>}
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="brand" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply filters"}</Button>
              <Button type="button" variant="ghost" onClick={clearAll}>Clear</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}