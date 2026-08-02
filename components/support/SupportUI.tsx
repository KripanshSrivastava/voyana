"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Input, Textarea, Select, Field, Button, Card } from "@/components/ui";
import { SUPPORT_CATEGORIES, SUPPORT_STATUSES } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

export function NewTicketForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/agent/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, category, message }) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not create ticket");
      router.push(`/agent/support/${json.data.id}`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); setBusy(false); }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold text-navy-900">New support ticket</h2>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} required /></Field>
          <Field label="Category"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{SUPPORT_CATEGORIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</Select></Field>
        </div>
        <Field label="How can we help?"><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required /></Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" variant="brand" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create ticket"}</Button>
      </form>
    </Card>
  );
}

export function ReplyForm({ ticketId, isAdmin = false }: { ticketId: string; isAdmin?: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/support/${ticketId}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, internal }) });
      setBody(""); setInternal(false); router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…" />
      <div className="flex items-center justify-between">
        {isAdmin ? <label className="flex items-center gap-2 text-sm text-navy-500"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note</label> : <span />}
        <Button type="submit" variant="brand" disabled={busy || !body.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send</>}</Button>
      </div>
    </form>
  );
}

export function TicketStatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function change(next: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/support/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
      router.refresh();
    } finally { setBusy(false); }
  }
  return (
    <Select value={status} onChange={(e) => change(e.target.value)} disabled={busy} className="w-48">
      {SUPPORT_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
    </Select>
  );
}
