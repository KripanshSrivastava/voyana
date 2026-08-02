"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Download } from "lucide-react";
import { Input, Select } from "@/components/ui";
import { LEAD_STATUSES, LEAD_QUALITIES } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

export function LeadFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  const exportHref = `/api/admin/leads/export?${params.toString()}`;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-navy-100 bg-white p-3 shadow-sm">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
        <Input
          defaultValue={params.get("q") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
          }}
          placeholder="Search lead ID, phone, email, destination…"
          className="pl-9"
        />
      </div>
      <Select value={params.get("status") ?? ""} onChange={(e) => update("status", e.target.value)} className="w-auto">
        <option value="">All statuses</option>
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>{titleCase(s)}</option>
        ))}
      </Select>
      <Select value={params.get("quality") ?? ""} onChange={(e) => update("quality", e.target.value)} className="w-auto">
        <option value="">All quality</option>
        {LEAD_QUALITIES.map((s) => (
          <option key={s} value={s}>{titleCase(s)}</option>
        ))}
      </Select>
      <a
        href={exportHref}
        className="inline-flex h-11 items-center gap-2 rounded-lg border border-navy-200 px-4 text-sm font-medium text-navy-700 hover:bg-navy-50"
      >
        <Download className="h-4 w-4" /> Export CSV
      </a>
    </div>
  );
}
