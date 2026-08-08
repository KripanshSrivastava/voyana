"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import { Button, Textarea } from "@/components/ui";

export function CreditOrderActions({ orderId, orderCode }: { orderId: string; orderCode: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "APPROVE" | "REJECT">(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function approve() {
    if (!confirm(`Approve order ${orderCode}? Credits will be added to the agent's account.`)) return;
    setBusy("APPROVE"); setError(null);
    try {
      const res = await fetch(`/api/admin/credit-orders/${orderId}/approve`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Approval failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally { setBusy(null); }
  }

  async function reject() {
    if (reason.trim().length < 3) { setError("Enter a reason (at least 3 characters)."); return; }
    setBusy("REJECT"); setError(null);
    try {
      const res = await fetch(`/api/admin/credit-orders/${orderId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Rejection failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rejection failed");
    } finally { setBusy(null); }
  }

  if (rejecting) {
    return (
      <div className="w-full sm:w-72">
        <label className="mb-1.5 block text-xs font-medium text-navy-700">Rejection reason</label>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Reference number doesn't match" />
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-2 flex gap-2">
          <Button variant="danger" onClick={reject} disabled={Boolean(busy)}>
            {busy === "REJECT" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm rejection"}
          </Button>
          <Button variant="ghost" onClick={() => { setRejecting(false); setError(null); }}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:min-w-[160px]">
      <Button variant="brand" onClick={approve} disabled={Boolean(busy)}>
        {busy === "APPROVE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Approve</>}
      </Button>
      <Button variant="outline" onClick={() => setRejecting(true)} disabled={Boolean(busy)}>
        <X className="h-4 w-4" /> Reject
      </Button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
