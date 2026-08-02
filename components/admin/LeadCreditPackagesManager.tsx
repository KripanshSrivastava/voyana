"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type PackageRow = {
  id: string;
  name: string;
  credits: number;
  priceInr: number;
  isActive: boolean;
  displayOrder: number;
};

export function LeadCreditPackagesManager({ packages }: { packages: PackageRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(packages);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function set<K extends keyof PackageRow>(id: string, key: K, value: PackageRow[K]) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
    setMessage(null);
  }

  async function save(row: PackageRow) {
    setBusy(row.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/lead-credit-packages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not save package");
      setMessage("Package saved.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save package");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-navy-50/60">
          <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
            <th className="px-4 py-3 font-medium">Package</th>
            <th className="px-4 py-3 font-medium">Credits</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">Cost / lead</th>
            <th className="px-4 py-3 font-medium">Active</th>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-50">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              <td className="px-4 py-3"><Input value={row.name} onChange={(e) => set(row.id, "name", e.target.value)} /></td>
              <td className="px-4 py-3"><Input type="number" value={row.credits} onChange={(e) => set(row.id, "credits", Number(e.target.value))} /></td>
              <td className="px-4 py-3"><Input type="number" value={row.priceInr} onChange={(e) => set(row.id, "priceInr", Number(e.target.value))} /></td>
              <td className="px-4 py-3 font-semibold text-navy-800">
                {row.credits > 0 ? formatINR(Math.round(row.priceInr / row.credits)) : "-"}
              </td>
              <td className="px-4 py-3">
                <input type="checkbox" checked={row.isActive} onChange={(e) => set(row.id, "isActive", e.target.checked)} />
              </td>
              <td className="px-4 py-3"><Input type="number" value={row.displayOrder} onChange={(e) => set(row.id, "displayOrder", Number(e.target.value))} /></td>
              <td className="px-4 py-3">
                <Button variant="brand" onClick={() => save(row)} disabled={busy === row.id}>
                  {busy === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {message && <div className="border-t border-navy-100 px-4 py-3 text-sm text-navy-600">{message}</div>}
    </div>
  );
}
