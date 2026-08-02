"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button, Input, Select, Textarea, Field } from "@/components/ui";
import { LEAD_STATUSES, LEAD_QUALITIES } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

async function patchLead(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");
}

export function LeadActions({
  id,
  status,
  quality,
  price,
  defaultPrice,
  agents,
  capacityFull,
}: {
  id: string;
  status: string;
  quality: string;
  price: number | null;
  defaultPrice: number;
  agents: { id: string; label: string }[];
  capacityFull: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [priceVal, setPriceVal] = useState(String(price ?? defaultPrice));
  const [statusVal, setStatusVal] = useState(status);
  const [qualityVal, setQualityVal] = useState(quality);
  const [note, setNote] = useState("");
  const [agentId, setAgentId] = useState("");

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <Field label="Lead price (₹)" hint="Set what agents pay to access this lead.">
        <div className="flex gap-2">
          <Input type="number" min={0} value={priceVal} onChange={(e) => setPriceVal(e.target.value)} />
          <Button variant="navy" onClick={() => run("price", () => patchLead(id, { price: Number(priceVal) }))} disabled={busy === "price"}>
            {busy === "price" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </Field>

      <Field label="Status">
        <div className="flex gap-2">
          <Select value={statusVal} onChange={(e) => setStatusVal(e.target.value)}>
            {LEAD_STATUSES.map((s) => (<option key={s} value={s}>{titleCase(s)}</option>))}
          </Select>
          <Button variant="navy" onClick={() => run("status", () => patchLead(id, { status: statusVal }))} disabled={busy === "status"}>
            {busy === "status" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
          </Button>
        </div>
      </Field>

      <Field label="Quality (override)">
        <div className="flex gap-2">
          <Select value={qualityVal} onChange={(e) => setQualityVal(e.target.value)}>
            {LEAD_QUALITIES.map((s) => (<option key={s} value={s}>{titleCase(s)}</option>))}
          </Select>
          <Button variant="navy" onClick={() => run("quality", () => patchLead(id, { quality: qualityVal }))} disabled={busy === "quality"}>
            {busy === "quality" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set"}
          </Button>
        </div>
      </Field>

      <div className="border-t border-navy-100 pt-4">
        <Field label="Distribute to agent" hint={capacityFull ? "Lead is fully distributed (2/2)." : "Assign directly and charge their wallet."}>
          <div className="flex gap-2">
            <Select value={agentId} onChange={(e) => setAgentId(e.target.value)} disabled={capacityFull || agents.length === 0}>
              <option value="">{agents.length ? "Select agent…" : "No eligible agents"}</option>
              {agents.map((a) => (<option key={a.id} value={a.id}>{a.label}</option>))}
            </Select>
            <Button
              variant="brand"
              disabled={!agentId || capacityFull || busy === "assign"}
              onClick={() =>
                run("assign", async () => {
                  const res = await fetch(`/api/admin/leads/${id}/assign`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ agentId }),
                  });
                  const json = await res.json();
                  if (!res.ok || !json.ok) throw new Error(json.error || "Assign failed");
                  setAgentId("");
                })
              }
            >
              {busy === "assign" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
            </Button>
          </div>
        </Field>
      </div>

      <div className="border-t border-navy-100 pt-4">
        <Field label="Add internal note">
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qualification notes, call outcome…" />
        </Field>
        <Button
          className="mt-2"
          variant="outline"
          disabled={!note.trim() || busy === "note"}
          onClick={() => run("note", async () => { await patchLead(id, { note }); setNote(""); })}
        >
          {busy === "note" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add note"}
        </Button>
      </div>
    </div>
  );
}
