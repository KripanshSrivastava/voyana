import "server-only";
import { logIntegration } from "../integrations/log";
import { toWhatsAppNumber } from "./phone";

/**
 * Outbound WhatsApp messaging via a self-hosted **open-wa** service
 * (`whatsapp-service/`) — an UNOFFICIAL WhatsApp Web automation client, not
 * Meta's Cloud API. It drives a real, persistently logged-in WhatsApp
 * session, so this file talks to it over the private Docker network rather
 * than an HTTPS API. See docs/WHATSAPP.md for the setup and the tradeoffs
 * (ban risk, no official support) that come with this approach.
 *
 * Design mirrors lib/email/mailer.ts on purpose:
 *  - Provider details live behind one function, so switching to Meta Cloud
 *    API (or a reseller) means rewriting `postToProvider` and nothing else.
 *  - NEVER throws. A failed message must not break lead ingestion or a
 *    purchase — WhatsApp is an enhancement, not a critical path.
 *  - Silent no-ops are logged to IntegrationLog in production so a missing
 *    config shows up at /admin/integrations/logs instead of vanishing.
 *
 * Unlike Meta's API, open-wa sends plain text — there's no provider-side
 * template approval, so callers just pass the fully-rendered message.
 */

export type WhatsAppResult = { ok: boolean; skipped?: boolean; id?: string };

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_SERVICE_URL && process.env.WHATSAPP_SERVICE_SECRET);
}

/**
 * Send a plain-text WhatsApp message.
 *
 * @param to    Raw phone string from the DB; normalised internally. When it
 *              can't be normalised we skip rather than guess.
 * @param text  Fully-rendered message body — see lib/whatsapp/templates.ts.
 * @param event Short label recorded on IntegrationLog rows for triage,
 *              e.g. "lead_alert" or "customer_ack".
 */
export async function sendWhatsAppMessage(
  to: string | null | undefined,
  text: string,
  event: string,
  opts?: { leadId?: string | null },
): Promise<WhatsAppResult> {
  const number = toWhatsAppNumber(to);
  if (!number) {
    // Not an error worth logging to IntegrationLog — a lead simply may not
    // have a usable phone number. Nothing actionable for an admin here.
    return { ok: false, skipped: true };
  }

  const serviceUrl = process.env.WHATSAPP_SERVICE_URL;
  const secret = process.env.WHATSAPP_SERVICE_SECRET;

  if (!serviceUrl || !secret) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[whatsapp:dev] ${event} -> ${number}: ${text}`);
      return { ok: true, skipped: true };
    }
    await logIntegration({
      integration: "whatsapp",
      event,
      status: "FAILED",
      leadId: opts?.leadId ?? null,
      message: "SKIPPED — WHATSAPP_SERVICE_URL / WHATSAPP_SERVICE_SECRET not set",
    });
    return { ok: false, skipped: true };
  }

  return postToProvider({ number, text, event, serviceUrl, secret, leadId: opts?.leadId ?? null });
}

/**
 * The only provider-specific function in this module. Swap the body of this
 * to move to Meta Cloud API or a reseller; every call site above stays
 * untouched.
 */
async function postToProvider(args: {
  number: string;
  text: string;
  event: string;
  serviceUrl: string;
  secret: string;
  leadId: string | null;
}): Promise<WhatsAppResult> {
  const { number, text, event, serviceUrl, secret, leadId } = args;
  const url = `${serviceUrl.replace(/\/$/, "")}/send`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: number, text }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      await logIntegration({
        integration: "whatsapp",
        event,
        status: "FAILED",
        leadId,
        message: `${res.status} ${detail}`,
      });
      return { ok: false };
    }

    const json = (await res.json().catch(() => null)) as { ok?: boolean; id?: string } | null;
    return { ok: true, id: json?.id };
  } catch (e) {
    await logIntegration({
      integration: "whatsapp",
      event,
      status: "FAILED",
      leadId,
      message: String(e),
    });
    return { ok: false };
  }
}
