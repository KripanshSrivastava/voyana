"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart, Lock } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { ASSIGNMENT_STATUSES } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

/** Legacy single-button entry point. Kept for any surface still importing it,
 *  but Available Leads now uses <BuyLeadControls /> which offers Shared vs
 *  Exclusive side-by-side. Defaults to a SHARED purchase to preserve behavior. */
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
      const res = await fetch(`/api/agent/leads/${leadId}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseType: "SHARED" }),
      });
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
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4" /> Buy lead</>}
      </Button>
      {disabled && disabledReason && <p className="mt-1 text-center text-xs text-navy-400">{disabledReason}</p>}
      {error && <p className="mt-1 text-center text-sm text-rose-600">{error}</p>}
    </div>
  );
}

/**
 * Two-option lead purchase — Shared or Exclusive. Prices/credits are
 * server-computed and passed in; this component just displays and dispatches.
 * The actual price charged is enforced server-side in purchaseLead(); if a
 * user hand-crafts a request with a different type or bad payload, the
 * server rejects it.
 */
export function BuyLeadControls({
  leadId,
  shared,
  exclusive,
  exclusiveOnly = false,
  disabled,
  disabledReason,
  creditsAvailable,
  className,
}: {
  leadId: string;
  shared: { priceInr: number; credits: number };
  exclusive: { priceInr: number; credits: number; eligible: boolean };
  /** True for lead types that are exclusive-only (e.g. INTERNATIONAL). When
   *  set, only the Buy Exclusive button renders — SHARED is server-rejected
   *  anyway, so hiding it prevents dead-clicks. */
  exclusiveOnly?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  creditsAvailable: number;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "SHARED" | "EXCLUSIVE">(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(purchaseType: "SHARED" | "EXCLUSIVE") {
    setBusy(purchaseType);
    setError(null);
    try {
      const res = await fetch(`/api/agent/leads/${leadId}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseType }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Purchase failed");
      router.push(`/agent/leads/${leadId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed");
      setBusy(null);
    }
  }

  const sharedNoCredits = creditsAvailable < shared.credits;
  const exclNoCredits = creditsAvailable < exclusive.credits;
  const exclDisabled = disabled || !exclusive.eligible || exclNoCredits;
  const exclReason = disabledReason
    ?? (!exclusive.eligible ? "Already shared with another agent" : exclNoCredits ? `Needs ${exclusive.credits} credits` : undefined);

  if (exclusiveOnly) {
    return (
      <div className={className}>
        <Button variant="brand" size="md" className="w-full" onClick={() => buy("EXCLUSIVE")} disabled={Boolean(busy) || exclDisabled}>
          {busy === "EXCLUSIVE"
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><Lock className="h-4 w-4" /> Buy Exclusive — ₹{exclusive.priceInr.toLocaleString("en-IN")}</>}
        </Button>
        <p className="mt-1 text-center text-[11px] text-navy-400">
          International leads are sold exclusively · {exclusive.credits} credit{exclusive.credits === 1 ? "" : "s"} · only you
        </p>
        {disabled && disabledReason && <p className="mt-1 text-center text-xs text-navy-400">{disabledReason}</p>}
        {!disabled && exclReason && !disabledReason && <p className="mt-1 text-center text-xs text-navy-400">{exclReason}</p>}
        {error && <p className="mt-1 text-center text-sm text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="md" onClick={() => buy("SHARED")} disabled={Boolean(busy) || disabled || sharedNoCredits}>
          {busy === "SHARED"
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><ShoppingCart className="h-4 w-4" /> Buy Shared — ₹{shared.priceInr.toLocaleString("en-IN")}</>}
        </Button>
        <Button variant="brand" size="md" onClick={() => buy("EXCLUSIVE")} disabled={Boolean(busy) || exclDisabled}>
          {busy === "EXCLUSIVE"
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><Lock className="h-4 w-4" /> Buy Exclusive — ₹{exclusive.priceInr.toLocaleString("en-IN")}</>}
        </Button>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2 text-center text-[11px] text-navy-400">
        <span>{shared.credits} credit{shared.credits === 1 ? "" : "s"}</span>
        <span>{exclusive.credits} credit{exclusive.credits === 1 ? "" : "s"} · only you</span>
      </div>
      {disabled && disabledReason && <p className="mt-1 text-center text-xs text-navy-400">{disabledReason}</p>}
      {!disabled && exclReason && !disabledReason && <p className="mt-1 text-center text-xs text-navy-400">Exclusive: {exclReason}</p>}
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
