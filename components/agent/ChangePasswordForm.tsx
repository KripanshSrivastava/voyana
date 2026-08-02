"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { Input, Field, Button, Card } from "@/components/ui";

export function ChangePasswordForm() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) { setError("New passwords do not match."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not change password");
      setDone(true); setCur(""); setNext(""); setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-md p-6">
      <h2 className="mb-4 font-semibold text-navy-900">Change password</h2>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Current password"><Input type="password" value={cur} onChange={(e) => { setCur(e.target.value); setDone(false); }} required autoComplete="current-password" /></Field>
        <Field label="New password" hint="At least 8 characters."><Input type="password" value={next} onChange={(e) => { setNext(e.target.value); setDone(false); }} required autoComplete="new-password" /></Field>
        <Field label="Confirm new password"><Input type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setDone(false); }} required autoComplete="new-password" /></Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {done && <p className="flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> Password updated.</p>}
        <Button type="submit" variant="brand" disabled={busy || !cur || !next}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
        </Button>
      </form>
    </Card>
  );
}
