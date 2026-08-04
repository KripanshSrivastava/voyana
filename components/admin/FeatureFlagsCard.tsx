"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { Card } from "@/components/ui";

type Flags = {
  vendorAdsEnabled: boolean;
  autoBuyEnabled: boolean;
  supportEnabled: boolean;
  packageMarketplaceEnabled: boolean;
};

const LABELS: Record<keyof Flags, { title: string; hint: string }> = {
  vendorAdsEnabled: { title: "Vendor Ads", hint: "Lets vendors create and manage advertising campaigns; admin still moderates every ad." },
  autoBuyEnabled: { title: "Auto-Buy Leads", hint: "Lets vendors set rules to automatically purchase matching leads." },
  supportEnabled: { title: "Support Tickets", hint: "Lets vendors open support tickets from their portal." },
  packageMarketplaceEnabled: { title: "Package Marketplace", hint: "Lets vendors manage their own package listings (admin still moderates)." },
};

/** Toggles high-impact feature flags via the dedicated flags endpoint — kept
 *  separate from the general settings save so this stays SUPER_ADMIN-gated
 *  without touching the rest of the settings form. */
export function FeatureFlagsCard({ initial }: { initial: Flags }) {
  const router = useRouter();
  const [flags, setFlags] = useState(initial);
  const [busyKey, setBusyKey] = useState<keyof Flags | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<keyof Flags | null>(null);

  async function toggle(key: keyof Flags) {
    const next = !flags[key];
    setBusyKey(key);
    setError(null);
    setSavedKey(null);
    try {
      const res = await fetch("/api/admin/flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not update this flag.");
      setFlags((f) => ({ ...f, [key]: next }));
      setSavedKey(key);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update this flag.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Card className="p-6 space-y-4 lg:col-span-2">
      <div>
        <h2 className="font-semibold text-navy-900">Feature flags</h2>
        <p className="text-sm text-navy-500">Only the Main Admin (Super Admin) can change these.</p>
      </div>
      <div className="divide-y divide-navy-100">
        {(Object.keys(LABELS) as (keyof Flags)[]).map((key) => (
          <div key={key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <div className="flex items-center gap-2 font-medium text-navy-800">
                {LABELS[key].title}
                {savedKey === key && <Check className="h-4 w-4 text-emerald-600" />}
              </div>
              <p className="text-sm text-navy-500">{LABELS[key].hint}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={flags[key]}
              onClick={() => toggle(key)}
              disabled={busyKey === key}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${flags[key] ? "bg-brand-600" : "bg-navy-200"}`}
            >
              {busyKey === key ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-white" />
              ) : (
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${flags[key] ? "translate-x-6" : "translate-x-1"}`} />
              )}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </Card>
  );
}
