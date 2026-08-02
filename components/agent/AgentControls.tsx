"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { ASSIGNMENT_STATUSES } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

export function BuyButton({
  leadId,
  disabled,
  disabledReason,
  size = "md",
  className,
}: {
  leadId: string;
  price: number;
  disabled?: boolean;
  disabledReason?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/leads/${leadId}/purchase`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Purchase failed");
      router.push(`/agent/leads/${leadId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed");
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button variant="primary" size={size} className="w-full" onClick={buy} disabled={busy || disabled}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4" /> Buy lead - 1 Credit</>}
      </Button>
      {disabled && disabledReason && <p className="mt-1 text-center text-xs text-navy-400">{disabledReason}</p>}
      {error && <p className="mt-1 text-center text-sm text-rose-600">{error}</p>}
    </div>
  );
}

export function LeadStatusControl({ leadId, current }: { leadId: string; current: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [busy, setBusy] = useState(false);

  async function update(next: string) {
    setStatus(next);
    setBusy(true);
    try {
      await fetch(`/api/agent/leads/${leadId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onChange={(e) => update(e.target.value)} disabled={busy}>
        {ASSIGNMENT_STATUSES.map((s) => (<option key={s} value={s}>{titleCase(s)}</option>))}
      </Select>
      {busy && <Loader2 className="h-4 w-4 animate-spin text-navy-400" />}
    </div>
  );
}
