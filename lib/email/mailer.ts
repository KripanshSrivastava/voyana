import "server-only";
import { logIntegration } from "../integrations/log";

/**
 * Provider-agnostic transactional email.
 * - If RESEND_API_KEY is set, sends via Resend's HTTP API (no SDK dependency).
 * - Otherwise no-ops in production and logs to console in development.
 * Never throws — a failed email must never break the lead pipeline.
 */
export type Email = { to: string; subject: string; html: string; text?: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Composes the From header: EMAIL_FROM as-is if it already has a display
 *  name ("Name <email>"), otherwise prefixes EMAIL_FROM_NAME onto a bare address. */
function fromHeader(): string | undefined {
  const from = process.env.EMAIL_FROM;
  if (!from) return undefined;
  if (from.includes("<")) return from;
  const name = process.env.EMAIL_FROM_NAME;
  return name ? `${name} <${from}>` : from;
}

export async function sendEmail(email: Email): Promise<{ ok: boolean; skipped?: boolean }> {
  const from = fromHeader();
  const key = process.env.RESEND_API_KEY;

  if (!key || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] → ${email.to} · ${email.subject}`);
    }
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html, text: email.text }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      await logIntegration({ integration: "email", event: "send", status: "FAILED", message: `${res.status} ${msg}` });
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    await logIntegration({ integration: "email", event: "send", status: "FAILED", message: String(e) });
    return { ok: false };
  }
}
