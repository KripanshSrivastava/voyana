"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Input, Textarea, Select, Field, Button, Card } from "@/components/ui";
import { TRIP_TYPES, LEAD_STATUSES, TRIP_CATEGORIES } from "@/lib/constants";
import { titleCase, cn } from "@/lib/utils";

export type AdminLeadValue = {
  customerName: string;
  phone: string;
  email: string;
  destinationText: string;
  departureCity: string;
  clientLocation: string;
  tripCategory: string;
  travelDate: string; // yyyy-mm-dd
  travelers: string;
  budget: string;
  tripType: string;
  message: string;
};

export const emptyAdminLead: AdminLeadValue = {
  customerName: "", phone: "", email: "", destinationText: "", departureCity: "",
  clientLocation: "", tripCategory: "",
  travelDate: "", travelers: "", budget: "", tripType: "", message: "",
};

export function AdminLeadForm({
  mode,
  leadId,
  initial,
  defaultPrice,
}: {
  mode: "create" | "edit";
  leadId?: string;
  initial?: AdminLeadValue;
  defaultPrice?: number;
}) {
  const router = useRouter();
  const [f, setF] = useState<AdminLeadValue>(initial ?? emptyAdminLead);
  const [status, setStatus] = useState("QUALIFIED");
  const [price, setPrice] = useState(defaultPrice ? String(defaultPrice) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof AdminLeadValue>(k: K, v: AdminLeadValue[K]) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const common = {
        customerName: f.customerName,
        phone: f.phone,
        email: f.email || undefined,
        destinationText: f.destinationText,
        departureCity: f.departureCity || undefined,
        clientLocation: f.clientLocation || undefined,
        tripCategory: f.tripCategory || undefined,
        travelDate: f.travelDate || null,
        travelers: f.travelers ? Number(f.travelers) : null,
        budget: f.budget ? Number(f.budget) : null,
        tripType: f.tripType || undefined,
        message: f.message || undefined,
      };
      let res: Response;
      if (mode === "create") {
        res = await fetch("/api/admin/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...common, status, price: price ? Number(price) : null, source: "manual" }),
        });
      } else {
        res = await fetch(`/api/admin/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ details: common }),
        });
      }
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      if (mode === "create") router.push(`/admin/leads/${json.data.id}`);
      else router.push(`/admin/leads/${leadId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-navy-900">Customer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={f.customerName} onChange={(e) => set("customerName", e.target.value)} required /></Field>
          <Field label="Phone"><Input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} required /></Field>
        </div>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>

        <h2 className="pt-2 font-semibold text-navy-900">Trip</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Destination"><Input value={f.destinationText} onChange={(e) => set("destinationText", e.target.value)} required /></Field>
          <Field label="Departure city"><Input value={f.departureCity} onChange={(e) => set("departureCity", e.target.value)} /></Field>
          <Field label="Client location"><Input value={f.clientLocation} onChange={(e) => set("clientLocation", e.target.value)} /></Field>
          <Field label="Trip category">
            <Select value={f.tripCategory} onChange={(e) => set("tripCategory", e.target.value)}>
              <option value="">—</option>
              {TRIP_CATEGORIES.map((c) => (<option key={c} value={c}>{titleCase(c)}</option>))}
            </Select>
          </Field>
          <Field label="Travel date"><Input type="date" value={f.travelDate} onChange={(e) => set("travelDate", e.target.value)} /></Field>
          <Field label="Travelers"><Input type="number" min={1} value={f.travelers} onChange={(e) => set("travelers", e.target.value)} /></Field>
          <Field label="Budget (₹)"><Input type="number" min={0} value={f.budget} onChange={(e) => set("budget", e.target.value)} /></Field>
          <Field label="Trip type">
            <Select value={f.tripType} onChange={(e) => set("tripType", e.target.value)}>
              <option value="">—</option>
              {TRIP_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
            </Select>
          </Field>
        </div>
        <Field label="Notes / requirements"><Textarea rows={3} value={f.message} onChange={(e) => set("message", e.target.value)} /></Field>
      </Card>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-navy-900">{mode === "create" ? "Create lead" : "Save changes"}</h2>
          {mode === "create" && (
            <>
              <Field label="Initial status">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {LEAD_STATUSES.map((s) => (<option key={s} value={s}>{titleCase(s)}</option>))}
                </Select>
              </Field>
              <Field label="Lead price (₹)" hint="Optional — set now or later.">
                <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              </Field>
            </>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" variant="brand" className={cn("w-full")} disabled={busy || !f.customerName || !f.phone || !f.destinationText}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> {mode === "create" ? "Create lead" : "Save details"}</>}
          </Button>
          {mode === "create" && <p className="text-xs text-navy-400">Manual leads are marked with source “manual”.</p>}
        </Card>
      </aside>
    </form>
  );
}
