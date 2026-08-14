import "server-only";
import type { WhatsAppTemplate } from "./client";
import { getMessageTemplate } from "../messaging/store";
import { renderTemplate } from "../messaging/render";

/**
 * WhatsApp message builders.
 *
 * Copy now lives in the database, editable at /admin/messaging, with the
 * hardcoded values in lib/messaging/defaults.ts as both the seed and the
 * fallback. These functions are therefore async — they read the current
 * template before building the payload.
 *
 * Two different shapes come out of here:
 *
 *  - `agentIntroMessage` returns a plain string. It is sent by the AGENT's
 *    own WhatsApp via a wa.me link, so the admin's text is used verbatim
 *    and needs no Meta approval.
 *
 *  - The other two return a `WhatsAppTemplate` — a template NAME plus
 *    ordered parameters. Meta holds the actual wording; we only choose which
 *    approved template to invoke and what to substitute into it. The admin's
 *    edited body is the source of truth for what SHOULD be registered with
 *    Meta, surfaced by the "Copy for Meta" button in the admin UI.
 *
 * Resolution order for the provider template name / language:
 *   database  →  environment override  →  hardcoded default
 */

/** Feature A — tell an agent a matching lead just landed. */
export async function agentLeadAlertTemplate(p: {
  agentName: string;
  tripCategory: string | null;
  destination: string;
  quality: string;
}): Promise<WhatsAppTemplate> {
  const tpl = await getMessageTemplate("whatsapp.lead_alert");
  return {
    name:
      tpl.providerTemplateName ||
      process.env.WHATSAPP_TEMPLATE_LEAD_ALERT ||
      "lead_alert",
    language: tpl.language || process.env.WHATSAPP_TEMPLATE_LANG || "en",
    // Order must match the {{1}}..{{n}} order registered with Meta — see
    // the `placeholders` array in lib/messaging/defaults.ts, which is what
    // the admin UI's "Copy for Meta" button numbers against.
    bodyParams: [
      p.agentName,
      // Meta rejects empty-string parameters, so every slot needs a value.
      p.tripCategory ? titleCase(p.tripCategory) : "travel",
      p.destination,
      titleCase(p.quality),
    ],
  };
}

/** Feature B — acknowledge a customer's enquiry. */
export async function customerEnquiryAckTemplate(p: {
  customerName: string;
  destination: string;
  leadCode: string;
}): Promise<WhatsAppTemplate> {
  const tpl = await getMessageTemplate("whatsapp.customer_ack");
  return {
    name:
      tpl.providerTemplateName ||
      process.env.WHATSAPP_TEMPLATE_CUSTOMER_ACK ||
      "enquiry_received",
    language: tpl.language || process.env.WHATSAPP_TEMPLATE_LANG || "en",
    bodyParams: [p.customerName, p.destination, p.leadCode],
  };
}

/**
 * Feature C — the pre-filled text an AGENT sends to a customer via a
 * click-to-chat link. Fully admin-editable; sent exactly as written.
 */
export async function agentIntroMessage(p: {
  customerName: string;
  destination: string;
  agentCompany: string;
  brandName: string;
  travelDate?: string | null;
  travellers?: string | null;
}): Promise<string> {
  const tpl = await getMessageTemplate("whatsapp.agent_intro");
  return renderTemplate(tpl.body, {
    customerName: p.customerName,
    destination: p.destination,
    agentCompany: p.agentCompany,
    brandName: p.brandName,
    // renderTemplate drops the whole line when one of these is empty, so an
    // enquiry without a travel date doesn't produce a dangling "Travel date:".
    travelDate: p.travelDate ?? "",
    travellers: p.travellers ?? "",
  });
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
