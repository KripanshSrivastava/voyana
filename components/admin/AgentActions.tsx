"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button, Input, Select, Field } from "@/components/ui";

export function AgentStatusActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(next: string) {
    setBusy(next);
    try {
      await fetch(`/api/admin/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const btn = (label: string, value: string, variant: "brand" | "danger" | "outline" | "navy") =>
    status !== value ? (
      <Button key={value} size="sm" variant={variant} onClick={() => setStatus(value)} disabled={!!busy}>
        {busy === value ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
      </Button>
    ) : null;

  return (
    <div className="flex flex-wrap gap-2">
      {btn("Approve", "APPROVED", "brand")}
      {btn("Suspend", "SUSPENDED", "navy")}
      {btn("Reject", "REJECTED", "danger")}
      {status !== "PENDING" && btn("Reset to pending", "PENDING", "outline")}
    </div>
  );
}

export function VerificationActions({ id, status, notes }: { id: string; status: string; notes: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState(notes ?? "");

  async function setVerification(next: string) {
    setBusy(next);
    try {
      await fetch(`/api/admin/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verification: { status: next, notes: note } }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const btn = (label: string, value: string, variant: "brand" | "danger" | "outline" | "navy") =>
    status !== value ? (
      <Button key={value} size="sm" variant={variant} onClick={() => setVerification(value)} disabled={!!busy}>
        {busy === value ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
      </Button>
    ) : null;

  return (
    <div className="space-y-3">
      <Field label="Verification note (shown to the vendor)">
        <Input placeholder="Optional note / reason" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {btn("Verify", "VERIFIED", "brand")}
        {btn("Under review", "UNDER_REVIEW", "navy")}
        {btn("Reject", "REJECTED", "danger")}
        {status !== "PENDING" && btn("Reset", "PENDING", "outline")}
      </div>
    </div>
  );
}

export function WalletCredit({ agentId }: { agentId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("CREDIT");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), type, note }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setAmount("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-32">
          <option value="CREDIT">Credit</option>
          <option value="DEBIT">Debit</option>
        </Select>
        <Input type="number" min={1} placeholder="Amount ₹" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <Field label="">
        <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" variant="brand" className="w-full" disabled={busy || !amount}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply to wallet"}
      </Button>
    </form>
  );
}
