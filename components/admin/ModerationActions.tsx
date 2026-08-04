"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

export function ModerationActions({ type, id }: { type: "destination" | "package"; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED", reason?: string) {
    setBusy(decision === "APPROVED" ? "approve" : "reject");
    try {
      const res = await fetch(`/api/admin/moderation/${type}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  function reject() {
    const reason = window.prompt("Reason for rejecting this submission (shown to the vendor):");
    if (!reason || !reason.trim()) return;
    decide("REJECTED", reason.trim());
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="brand" onClick={() => decide("APPROVED")} disabled={!!busy}>
        {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
      </Button>
      <Button size="sm" variant="danger" onClick={reject} disabled={!!busy}>
        {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Reject
      </Button>
    </div>
  );
}
