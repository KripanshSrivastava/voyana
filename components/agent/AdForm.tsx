"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Info } from "lucide-react";
import { Input, Textarea, Select, Field, Button, Card } from "@/components/ui";

/** One of the vendor's own approved CMS submissions the ad can point at. */
export type AdTargetOption = {
  key: string;               // `${type}:${id}` — uniquely identifies the choice
  type: "DESTINATION" | "PACKAGE" | "TOUR";
  id: string;
  label: string;             // "Package · Kashmir Honeymoon"
};

/**
 * Vendor Ad creation form. Deliberately minimal — the vendor picks WHAT
 * they want to promote (from their own approved submissions) and writes a
 * headline; everything else (landing URL, destination label, bidding) is
 * derived server-side. No rupee amounts, no bidding — the cost is a flat
 * per-click credit rate configured by admin and shown here.
 */
export function AdForm({ targets, adCostPerClickCredits }: { targets: AdTargetOption[]; adCostPerClickCredits: number }) {
  const router = useRouter();
  const [f, setF] = useState({ target: "", title: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(submitForReview: boolean) {
    setBusy(true);
    setError(null);
    try {
      const [type, id] = f.target.split(":");
      if (!type || !id) throw new Error("Choose what you want to advertise.");
      const res = await fetch("/api/agent/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: f.title,
          description: f.description,
          targetType: type,
          targetSubmissionId: id,
          submit: submitForReview,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setF({ target: "", title: "", description: "" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-1 font-semibold text-navy-900">Create advertisement</h2>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-navy-500">
        <Info className="h-3.5 w-3.5" />
        Each click costs {adCostPerClickCredits} Credit{adCostPerClickCredits === 1 ? "" : "s"} from your balance.
      </p>

      {targets.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You don&apos;t have any approved destinations, tours, or packages yet. Add one under <span className="font-semibold">Add Your Package, Destination or Tour</span> and wait for approval before creating an ad.
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="What do you want to advertise?" hint="Pick one of your approved destinations, tours, or packages. The ad links directly to it.">
            <Select value={f.target} onChange={(e) => set("target", e.target.value)} required>
              <option value="">— Select —</option>
              {targets.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ad headline" hint="Short, catchy title travellers will see on the ad card.">
            <Input value={f.title} onChange={(e) => set("title", e.target.value)} required maxLength={120} />
          </Field>
          <Field label="Ad description (optional)">
            <Textarea rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => submit(false)} disabled={busy || !f.title || !f.target}>Save draft</Button>
            <Button variant="brand" onClick={() => submit(true)} disabled={busy || !f.title || !f.target}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for review"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
