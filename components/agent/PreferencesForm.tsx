"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Bell, Zap, ChevronDown } from "lucide-react";
import { Input, Field, Button, Card } from "@/components/ui";
import { TRIP_CATEGORIES } from "@/lib/constants";
import { cn, titleCase } from "@/lib/utils";

export type PrefValue = {
  alertEmail: boolean; alertInApp: boolean; alertWhatsapp: boolean; alertCategories: string[]; alertDestinations: string[];
  autoBuyEnabled: boolean; autoBuyPurchaseType: "SHARED" | "EXCLUSIVE"; autoBuyCategories: string[]; autoBuyDestinations: string[]; autoBuyClientLocations: string;
};

function CategoryChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <div className="flex flex-wrap gap-2">
      {TRIP_CATEGORIES.map((c) => (
        <button type="button" key={c} onClick={() => toggle(c)}
          className={cn("rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
            value.includes(c) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-navy-200 text-navy-600 hover:border-navy-300")}>
          {titleCase(c)}
        </button>
      ))}
    </div>
  );
}

/** Multi-select dropdown of the site's actual published destinations —
 *  replaces free-text destination keywords so agents pick from what's
 *  really on the website instead of typing something that never matches. */
function DestinationMultiSelect({
  destinations,
  value,
  onChange,
  disabled,
}: {
  destinations: { id: string; name: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggle = (name: string) => onChange(value.includes(name) ? value.filter((x) => x !== name) : [...value, name]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-navy-200 bg-white px-3 text-left text-sm text-navy-900 shadow-sm disabled:opacity-60"
      >
        <span className={value.length === 0 ? "text-navy-400" : ""}>
          {value.length === 0 ? "Any destination" : `${value.length} destination${value.length === 1 ? "" : "s"} selected`}
        </span>
        <ChevronDown className="h-4 w-4 text-navy-400" />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-navy-200 bg-white p-2 shadow-lg">
          {destinations.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-navy-400">No published destinations yet.</p>
          ) : (
            destinations.map((d) => (
              <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-navy-50">
                <input type="checkbox" checked={value.includes(d.name)} onChange={() => toggle(d.name)} />
                {d.name}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function PreferencesForm({
  initial,
  autoBuyAllowed,
  destinations,
}: {
  initial: PrefValue;
  autoBuyAllowed: boolean;
  destinations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [f, setF] = useState<PrefValue>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof PrefValue>(k: K, v: PrefValue[K]) => { setF((s) => ({ ...s, [k]: v })); setSaved(false); };
  const toList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  async function save() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/agent/preferences", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertEmail: f.alertEmail, alertInApp: f.alertInApp, alertWhatsapp: f.alertWhatsapp,
          alertCategories: f.alertCategories,
          alertDestinations: f.alertDestinations,
          autoBuyEnabled: f.autoBuyEnabled,
          autoBuyPurchaseType: f.autoBuyPurchaseType,
          autoBuyCategories: f.autoBuyCategories,
          autoBuyDestinations: f.autoBuyDestinations,
          autoBuyClientLocations: toList(f.autoBuyClientLocations),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      setSaved(true); router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-navy-900">Lead alerts</h2></div>
        <p className="text-sm text-navy-500">Get notified when a matching lead enters the marketplace.</p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.alertInApp} onChange={(e) => set("alertInApp", e.target.checked)} /> In-app</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.alertEmail} onChange={(e) => set("alertEmail", e.target.checked)} /> Email</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.alertWhatsapp} onChange={(e) => set("alertWhatsapp", e.target.checked)} /> WhatsApp</label>
        </div>
        <p className="text-xs text-navy-400">
          WhatsApp alerts go to your registered contact number. Make sure it&apos;s correct on your Profile page.
        </p>
        <Field label="Categories"><CategoryChips value={f.alertCategories} onChange={(v) => set("alertCategories", v)} /></Field>
        <Field label="Destinations" hint="Leave empty to be alerted about every destination.">
          <DestinationMultiSelect destinations={destinations} value={f.alertDestinations} onChange={(v) => set("alertDestinations", v)} />
        </Field>
      </Card>

      <Card className={cn("p-6 space-y-4", !autoBuyAllowed && "opacity-60")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Zap className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-navy-900">Auto-buy leads</h2></div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" disabled={!autoBuyAllowed} checked={f.autoBuyEnabled} onChange={(e) => set("autoBuyEnabled", e.target.checked)} />
            {f.autoBuyEnabled ? "On" : "Off"}
          </label>
        </div>
        {!autoBuyAllowed && <p className="text-sm text-amber-600">Auto-buy is currently disabled by the Moksh Booking team.</p>}
        <p className="text-sm text-navy-500">Automatically purchase matching leads the moment they become available, using your Lead Credits. Only verified, approved accounts with at least 1 Lead Credit auto-buy.</p>
        <Field label="Purchase type" hint="Exclusive costs more credits and only succeeds on leads nobody else has bought yet.">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="autoBuyPurchaseType"
                disabled={!autoBuyAllowed}
                checked={f.autoBuyPurchaseType === "SHARED"}
                onChange={() => set("autoBuyPurchaseType", "SHARED")}
              />
              Shared
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="autoBuyPurchaseType"
                disabled={!autoBuyAllowed}
                checked={f.autoBuyPurchaseType === "EXCLUSIVE"}
                onChange={() => set("autoBuyPurchaseType", "EXCLUSIVE")}
              />
              Exclusive
            </label>
          </div>
        </Field>
        <Field label="Categories"><CategoryChips value={f.autoBuyCategories} onChange={(v) => set("autoBuyCategories", v)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Destinations" hint="Leave empty to auto-buy from every destination.">
            <DestinationMultiSelect destinations={destinations} value={f.autoBuyDestinations} onChange={(v) => set("autoBuyDestinations", v)} disabled={!autoBuyAllowed} />
          </Field>
          <Field label="Client locations (comma-separated)" hint="Leave empty to auto-buy from every location.">
            <Input disabled={!autoBuyAllowed} value={f.autoBuyClientLocations} onChange={(e) => set("autoBuyClientLocations", e.target.value)} placeholder="Delhi, Mumbai" />
          </Field>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="brand" onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save preferences"}</Button>
        {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> Saved</span>}
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>
    </div>
  );
}
