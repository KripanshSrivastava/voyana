import "server-only";
import { logIntegration } from "../integrations/log";
import { toWhatsAppNumber } from "./phone";

/**
 * Outbound WhatsApp messaging via the **Meta WhatsApp Cloud API**.
 *
 * Design mirrors lib/email/mailer.ts on purpose:
 *  - Provider details live behind one function, so switching to AiSensy /
 *    Interakt / Twilio means rewriting `postToProvider` and nothing else.
 *  - NEVER throws. A failed message must not break lead ingestion or a
 *    purchase — WhatsApp is an enhancement, not a critical path.
 *  - Silent no-ops are logged to IntegrationLog in production so a missing
 *    token shows up at /admin/integrations/logs instead of vanishing. This
 *    is the exact failure mode that made the 2FA email bug hard to diagnose.
 *
 * IMPORTANT — WhatsApp policy:
 * Business-INITIATED messages (our lead alerts and customer auto-replies)
 * must use a template that Meta has pre-approved. You cannot send arbitrary
 * text. Free-form replies are only allowed inside a 24-hour customer service
 * window opened by the customer messaging you first. See docs/WHATSAPP.md
 * for the template bodies to register.
 */

const GRAPH_VERSION = "v21.0";

export type WhatsAppTemplate = {
  /** Template name exactly as registered in Meta Business Manager. */
  name: string;
  /** BCP-47ish language code registered with the template, e.g. "en" or "en_US". */
  language: string;
  /** Ordered body parameters substituting {{1}}, {{2}}, … in the template. */
  bodyParams: string[];
};

export type WhatsAppResult = { ok: boolean; skipped?: boolean; id?: string };

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Send a pre-approved template message.
 *
 * @param to    Raw phone string from the DB; normalised internally. When it
 *              can't be normalised we skip rather than guess.
 * @param event Short label recorded on IntegrationLog rows for triage,
 *              e.g. "lead_alert" or "customer_ack".
 */
export async function sendWhatsAppTemplate(
  to: string | null | undefined,
  template: WhatsAppTemplate,
  event: string,
  opts?: { leadId?: string | null },
): Promise<WhatsAppResult> {
  const number = toWhatsAppNumber(to);
  if (!number) {
    // Not an error worth logging to IntegrationLog — a lead simply may not
    // have a usable phone number. Nothing actionable for an admin here.
    return { ok: false, skipped: true };
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[whatsapp:dev] ${event} -> ${number} template=${template.name}`);
      return { ok: true, skipped: true };
    }
    await logIntegration({
      integration: "whatsapp",
      event,
      status: "FAILED",
      leadId: opts?.leadId ?? null,
      message: `SKIPPED — WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set (template=${template.name})`,
    });
    return { ok: false, skipped: true };
  }

  return postToProvider({ number, template, event, token, phoneNumberId, leadId: opts?.leadId ?? null });
}

/**
 * The only provider-specific function in this module. Swap the body of this
 * to move off Meta Cloud API; every call site above stays untouched.
 */
async function postToProvider(args: {
  number: string;
  template: WhatsAppTemplate;
  event: string;
  token: string;
  phoneNumberId: string;
  leadId: string | null;
}): Promise<WhatsAppResult> {
  const { number, template, event, token, phoneNumberId, leadId } = args;
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: number,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          components: template.bodyParams.length
            ? [
                {
                  type: "body",
                  parameters: template.bodyParams.map((text) => ({ type: "text", text })),
                },
              ]
            : [],
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      await logIntegration({
        integration: "whatsapp",
        event,
        status: "FAILED",
        leadId,
        message: `${res.status} ${detail} (template=${template.name})`,
      });
      return { ok: false };
    }

    const json = (await res.json().catch(() => null)) as { messages?: { id?: string }[] } | null;
    return { ok: true, id: json?.messages?.[0]?.id };
  } catch (e) {
    await logIntegration({
      integration: "whatsapp",
      event,
      status: "FAILED",
      leadId,
      message: `${String(e)} (template=${template.name})`,
    });
    return { ok: false };
  }
}
