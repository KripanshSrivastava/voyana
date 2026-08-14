"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, RotateCcw, MessageCircle, AlertTriangle, Copy } from "lucide-react";
import { Card, Button, Textarea, Input, Field } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { renderTemplate } from "@/lib/messaging/render";

export type TemplateRow = {
  key: string;
  label: string;
  description: string;
  body: string;
  providerTemplateName: string | null;
  language: string;
  sendsVerbatim: boolean;
  isFallback: boolean;
  placeholders: { name: string; example: string; description: string }[];
};

export function MessageTemplatesManager({ initial }: { initial: TemplateRow[] }) {
  return (
    <div className="space-y-6">
      {initial.map((t) => (
        <TemplateEditor key={t.key} template={t} />
      ))}
    </div>
  );
}

function TemplateEditor({ template }: { template: TemplateRow }) {
  const router = useRouter();
  const [body, setBody] = useState(template.body);
  const [providerName, setProviderName] = useState(template.providerTemplateName ?? "");
  const [language, setLanguage] = useState(template.language);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const dirty =
    body !== template.body ||
    providerName !== (template.providerTemplateName ?? "") ||
    language !== template.language;

  // Live preview uses the exact same renderer the sender uses, so what the
  // admin sees here is what a recipient gets — including the "drop the line
  // when the value is empty" behaviour.
  const preview = useMemo(() => {
    const vars: Record<string, string> = {};
    for (const p of template.placeholders) vars[p.name] = p.example;
    return renderTemplate(body, vars);
  }, [body, template.placeholders]);

  /** Insert a placeholder at the cursor rather than making the admin type braces. */
  function insertPlaceholder(name: string) {
    const el = textareaRef.current;
    const token = `{{${name}}}`;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    // Restore focus and place the caret after the inserted token.
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function submit(reset = false) {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/message-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          reset
            ? { key: template.key, reset: true }
            : {
                key: template.key,
                body,
                providerTemplateName: providerName || null,
                language,
              },
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not save.");
      setSaved(true);
      toast.success(reset ? "Restored the default wording." : "Message saved.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function copyForMeta() {
    // Meta's template editor uses positional {{1}}, {{2}} … so translate our
    // named placeholders into their numbered form in registration order.
    let out = body;
    template.placeholders.forEach((p, i) => {
      out = out.replaceAll(`{{${p.name}}}`, `{{${i + 1}}}`);
    });
    try {
      await navigator.clipboard.writeText(out);
      toast.success("Copied in Meta's {{1}} format — paste into WhatsApp Manager.");
    } catch {
      toast.error("Couldn't access the clipboard.");
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-brand-600" />
            <h2 className="font-semibold text-navy-900">{template.label}</h2>
            {template.isFallback && (
              <span className="rounded bg-navy-100 px-1.5 py-0.5 text-[10px] font-semibold text-navy-600">
                DEFAULT
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-navy-500">{template.description}</p>
        </div>
      </div>

      {/* Approval warning for provider-backed templates ------------------ */}
      {!template.sendsVerbatim && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <strong>Editing here does not change what sends.</strong> WhatsApp requires Meta to
            approve this wording first. Save your change, use <em>Copy for Meta</em>, paste it into
            WhatsApp Manager, and wait for approval. Until then the previously approved wording
            continues to send.
          </div>
        </div>
      )}

      {/* Placeholder chips ---------------------------------------------- */}
      <div>
        <div className="mb-2 text-xs font-medium text-navy-500">
          Click to insert · these are replaced with real values when the message sends
        </div>
        <div className="flex flex-wrap gap-2">
          {template.placeholders.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => insertPlaceholder(p.name)}
              title={`${p.description} — e.g. "${p.example}"`}
              className="rounded-lg border border-navy-200 bg-white px-2.5 py-1 font-mono text-xs text-navy-700 transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              {`{{${p.name}}}`}
            </button>
          ))}
        </div>
      </div>

      <Field label="Message text">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={template.sendsVerbatim ? 10 : 4}
          className="font-mono text-sm"
        />
      </Field>

      {/* Provider identity — only meaningful for approved templates ------ */}
      {!template.sendsVerbatim && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meta template name">
            <Input
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="lead_alert"
            />
          </Field>
          <Field label="Template language code">
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" />
          </Field>
        </div>
      )}

      {/* Live preview ---------------------------------------------------- */}
      <div>
        <div className="mb-2 text-xs font-medium text-navy-500">Preview with sample values</div>
        <div className="whitespace-pre-wrap rounded-xl bg-[#dcf8c6] px-4 py-3 text-sm leading-relaxed text-navy-900 shadow-sm">
          {preview || <span className="text-navy-400">Nothing to preview yet.</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="brand" onClick={() => submit(false)} disabled={busy || !dirty}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save message"}
        </Button>
        {!template.sendsVerbatim && (
          <Button variant="outline" onClick={copyForMeta} disabled={busy}>
            <Copy className="h-4 w-4" /> Copy for Meta
          </Button>
        )}
        <Button variant="ghost" onClick={() => submit(true)} disabled={busy}>
          <RotateCcw className="h-4 w-4" /> Restore default
        </Button>
        {saved && !dirty && (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </Card>
  );
}
