"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

export function VendorAdActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(next: string) {
    setBusy(next);
    try {
      const res = await fetch(`/api/admin/vendor-ads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "APPROVED" && (
        <Button size="sm" variant="brand" onClick={() => setStatus("APPROVED")} disabled={!!busy}>
          {busy === "APPROVED" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
        </Button>
      )}
      {status !== "REJECTED" && (
        <Button size="sm" variant="danger" onClick={() => setStatus("REJECTED")} disabled={!!busy}>
          {busy === "REJECTED" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
        </Button>
      )}
      {status === "APPROVED" && (
        <Button size="sm" variant="outline" onClick={() => setStatus("PAUSED")} disabled={!!busy}>
          {busy === "PAUSED" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pause"}
        </Button>
      )}
      {status === "PAUSED" && (
        <Button size="sm" variant="brand" onClick={() => setStatus("APPROVED")} disabled={!!busy}>
          {busy === "APPROVED" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resume"}
        </Button>
      )}
    </div>
  );
}