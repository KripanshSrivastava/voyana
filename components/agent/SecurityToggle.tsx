"use client";

import { useState } from "react";
import { Loader2, Check, ShieldCheck } from "lucide-react";
import { Button, Card } from "@/components/ui";

export function SecurityToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !enabled;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/agent/security", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not update security settings.");
      setEnabled(json.data.twoFactorEnabled);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update security settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-md p-6">
      <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-navy-900">Email two-factor authentication</h2></div>
      <p className="mt-1.5 text-sm text-navy-500">
        When enabled, we&apos;ll email you a 6-digit code to enter each time you sign in, in addition to your password.
      </p>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-navy-100 px-4 py-3">
        <span className="text-sm font-medium text-navy-800">Email 2FA is {enabled ? "on" : "off"}</span>
        <Button type="button" variant={enabled ? "outline" : "brand"} onClick={toggle} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? "Turn off" : "Turn on"}
        </Button>
      </div>
      {saved && <p className="mt-2 flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> Saved.</p>}
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </Card>
  );
}
