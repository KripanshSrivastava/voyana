"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

export function SpamReportActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"APPROVE" | "REJECT" | null>(null);

  async function run(action: "APPROVE" | "REJECT") {
    if (action === "APPROVE" && !window.confirm("Approve this spam report and refund the vendor?")) return;
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/spam-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (status !== "PENDING") return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="brand" onClick={() => run("APPROVE")} disabled={!!busy}>
        {busy === "APPROVE" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve + Refund"}
      </Button>
      <Button variant="outline" onClick={() => run("REJECT")} disabled={!!busy}>
        {busy === "REJECT" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
      </Button>
    </div>
  );
}