"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Bell, Zap } from "lucide-react";
import { Input, Field, Button, Card } from "@/components/ui";
import { TRIP_CATEGORIES, LEAD_QUALITIES } from "@/lib/constants";
import { cn, titleCase } from "@/lib/utils";

const QUALITY_OPTIONS = LEAD_QUALITIES.filter((q) => q !== "UNREVIEWED");

export type PrefValue = {
  alertEmail: boolean; alertInApp: boolean; alertWhatsapp: boolean; alertCategories: string[]; alertDestinations: string;
  alertMinQuality: string; alertMinBudget: string; alertMaxBudget: string;
  autoBuyEnabled: boolean; autoBuyCategories: string[]; autoBuyDestinations: string; autoBuyClientLocations: string;
  autoBuyMinQuality: string; autoBuyMinBudget: string; autoBuyMaxBudget: string;
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

export function PreferencesForm({ initial, autoBuyAllowed }: { initial: PrefValue; autoBuyAllowed: boolean }) {
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
      const numOrNull = (s: string) => {
        const n = Number(s.trim());
        return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
      };
      const res = await fetch("/api/agent/preferences", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertEmail: f.alertEmail, alertInApp: f.alertInApp, alertWhatsapp: f.alertWhatsapp,
          alertCategories: f.alertCategories,
          alertDestinations: toList(f.alertDestinations),
          alertMinQuality: f.alertMinQuality || null,
          alertMinBudget: numOrNull(f.alertMinBudget),
          alertMaxBudget: numOrNull(f.alertMaxBudget),
          autoBuyEnabled: f.autoBuyEnabled, autoBuyCategories: f.autoBuyCategories,
          autoBuyDestinations: toList(f.autoBuyDestinations), autoBuyClientLocations: toList(f.autoBuyClientLocations),
          autoBuyMinQuality: f.autoBuyMinQuality || null,
          autoBuyMinBudget: numOrNull(f.autoBuyMinBudget),
          autoBuyMaxBudget: numOrNull(f.autoBuyMaxBudget),
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
        <Field label="Destinations (comma-separated)"><Input value={f.alertDestinations} onChange={(e) => set("alertDestinations", e.target.value)} placeholder="Kashmir, Goa, Dubai" /></Field>
        <Field label="Minimum quality">
          <select
            value={f.alertMinQuality}
            onChange={(e) => set("alertMinQuality", e.target.value)}
            className="h-11 w-full rounded-lg border border-navy-200 bg-white px-3 text-navy-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="">Any quality</option>
            {QUALITY_OPTIONS.map((q) => (<option key={q} value={q}>{titleCase(q)} or better</option>))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum trip budget (₹)"><Input type="number" min={0} value={f.alertMinBudget} onChange={(e) => set("alertMinBudget", e.target.value)} placeholder="e.g. 20000" /></Field>
          <Field label="Maximum trip budget (₹)"><Input type="number" min={0} value={f.alertMaxBudget} onChange={(e) => set("alertMaxBudget", e.target.value)} placeholder="e.g. 200000" /></Field>
        </div>
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
        <Field label="Categories"><CategoryChips value={f.autoBuyCategories} onChange={(v) => set("autoBuyCategories", v)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Destinations (comma-separated)"><Input value={f.autoBuyDestinations} onChange={(e) => set("autoBuyDestinations", e.target.value)} placeholder="Kashmir, Manali" /></Field>
          <Field label="Client locations (comma-separated)"><Input value={f.autoBuyClientLocations} onChange={(e) => set("autoBuyClientLocations", e.target.value)} placeholder="Delhi, Mumbai" /></Field>
        </div>
        <Field label="Minimum quality">
          <select
            value={f.autoBuyMinQuality}
            onChange={(e) => set("autoBuyMinQuality", e.target.value)}
            disabled={!autoBuyAllowed}
            className="h-11 w-full rounded-lg border border-navy-200 bg-white px-3 text-navy-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
          >
            <option value="">Any quality</option>
            {QUALITY_OPTIONS.map((q) => (<option key={q} value={q}>{titleCase(q)} or better</option>))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum trip budget (₹)"><Input type="number" min={0} disabled={!autoBuyAllowed} value={f.autoBuyMinBudget} onChange={(e) => set("autoBuyMinBudget", e.target.value)} placeholder="e.g. 20000" /></Field>
          <Field label="Maximum trip budget (₹)"><Input type="number" min={0} disabled={!autoBuyAllowed} value={f.autoBuyMaxBudget} onChange={(e) => set("autoBuyMaxBudget", e.target.value)} placeholder="e.g. 200000" /></Field>
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
