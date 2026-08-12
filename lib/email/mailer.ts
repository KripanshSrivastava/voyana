import "server-only";
import { logIntegration } from "../integrations/log";

/**
 * Provider-agnostic transactional email through Resend.
 * - If RESEND_API_KEY is set, sends via Resend's HTTP API (no SDK dependency).
 * - Otherwise no-ops in production and logs to console in development.
 * Never throws — a failed email must never break the lead pipeline.
 *
 * Sender identity is picked per-category from a single verified Resend domain
 * (send.mokshbooking.app). Each category maps to a purpose-specific address
 * (verify@, leads@, bookings@, support@, account@) so recipients can filter
 * and platforms can score reputation independently. All five addresses live
 * under the same Resend domain — no separate API keys required.
 */
export type EmailCategory = "verify" | "leads" | "bookings" | "support" | "account";

export type Email = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category: EmailCategory;
};

const BRAND_NAME = process.env.EMAIL_FROM_NAME || "Moksh Booking";
const SEND_DOMAIN = process.env.EMAIL_SEND_DOMAIN || "send.mokshbooking.app";

const CATEGORY_ADDRESS: Record<EmailCategory, string> = {
  verify: "verify",
  leads: "leads",
  bookings: "bookings",
  support: "support",
  account: "account",
};

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromHeader(category: EmailCategory): string {
  return `${BRAND_NAME} <${CATEGORY_ADDRESS[category]}@${SEND_DOMAIN}>`;
}

export async function sendEmail(email: Email): Promise<{ ok: boolean; skipped?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = fromHeader(email.category);

  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] ${email.category} → ${email.to} · ${email.subject}`);
      return { ok: true, skipped: true };
    }
    // Silent no-ops in production are the reason "no email arrives" bugs
    // are so hard to debug. Log to IntegrationLog so /admin/integrations/logs
    // makes the misconfiguration visible.
    await logIntegration({
      integration: "email",
      event: "send",
      status: "FAILED",
      message: `SKIPPED — RESEND_API_KEY not set (${email.category} → ${email.to})`,
    });
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html, text: email.text }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      await logIntegration({ integration: "email", event: "send", status: "FAILED", message: `${res.status} ${msg} (${email.category})` });
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    await logIntegration({ integration: "email", event: "send", status: "FAILED", message: `${String(e)} (${email.category})` });
    return { ok: false };
  }
}
