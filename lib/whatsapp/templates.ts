import "server-only";
import { getMessageTemplate } from "../messaging/store";
import { renderTemplate } from "../messaging/render";

/**
 * WhatsApp message builders.
 *
 * Copy lives in the database, editable at /admin/messaging, with the
 * hardcoded values in lib/messaging/defaults.ts as both the seed and the
 * fallback. These functions are therefore async — they read the current
 * template before rendering it.
 *
 * All three return a plain string, sent verbatim. Baileys has no
 * provider-side template/approval concept — unlike Meta's Cloud API, there
 * is nothing to register, so the admin's edited body is exactly what sends.
 */

/** Feature A — tell an agent a matching lead just landed. */
export async function agentLeadAlertTemplate(p: {
  agentName: string;
  tripCategory: string | null;
  destination: string;
  quality: string;
  brandName: string;
}): Promise<string> {
  const tpl = await getMessageTemplate("whatsapp.lead_alert");
  return renderTemplate(tpl.body, {
    agentName: p.agentName,
    tripCategory: p.tripCategory ? titleCase(p.tripCategory) : "travel",
    destination: p.destination,
    quality: titleCase(p.quality),
    brandName: p.brandName,
  });
}

/** Feature B — acknowledge a customer's enquiry. */
export async function customerEnquiryAckTemplate(p: {
  customerName: string;
  destination: string;
  leadCode: string;
  brandName: string;
}): Promise<string> {
  const tpl = await getMessageTemplate("whatsapp.customer_ack");
  return renderTemplate(tpl.body, {
    customerName: p.customerName,
    destination: p.destination,
    leadCode: p.leadCode,
    brandName: p.brandName,
  });
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
