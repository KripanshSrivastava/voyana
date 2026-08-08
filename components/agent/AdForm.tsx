"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Input, Textarea, Select, Field, Button, Card } from "@/components/ui";
import { TRIP_CATEGORIES } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

export function AdForm() {
  const router = useRouter();
  const [f, setF] = useState({ title: "", description: "", destination: "", clientLocation: "", category: "", landingUrl: "", dailyBudget: "", maxBid: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(submit: boolean) {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/agent/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, submit }) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setF({ title: "", description: "", destination: "", clientLocation: "", category: "", landingUrl: "", dailyBudget: "", maxBid: "" });
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold text-navy-900">Create advertisement</h2>
      <div className="space-y-4">
        <Field label="Title"><Input value={f.title} onChange={(e) => set("title", e.target.value)} required /></Field>
        <Field label="Description"><Textarea rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Destination"><Input value={f.destination} onChange={(e) => set("destination", e.target.value)} /></Field>
          <Field label="Target client location"><Input value={f.clientLocation} onChange={(e) => set("clientLocation", e.target.value)} /></Field>
          <Field label="Category"><Select value={f.category} onChange={(e) => set("category", e.target.value)}><option value="">—</option>{TRIP_CATEGORIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</Select></Field>
          <Field label="Landing URL" hint="Full URL including https:// — travellers who click your ad land here.">
            <Input type="url" value={f.landingUrl} onChange={(e) => set("landingUrl", e.target.value)} placeholder="https://mokshbooking.app/..." />
          </Field>
          <Field label="Daily budget (₹)">
            <Input type="number" min={0} step={1} value={f.dailyBudget} onChange={(e) => set("dailyBudget", e.target.value)} />
          </Field>
          <Field label="Maximum bid (₹)" hint="The highest amount you'll pay for one click on this ad.">
            <Input type="number" min={0} step={1} value={f.maxBid} onChange={(e) => set("maxBid", e.target.value)} />
          </Field>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => submit(false)} disabled={busy || !f.title}>Save draft</Button>
          <Button variant="brand" onClick={() => submit(true)} disabled={busy || !f.title}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for review"}</Button>
        </div>
      </div>
    </Card>
  );
}
