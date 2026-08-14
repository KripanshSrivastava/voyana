import "server-only";
import { prisma } from "../db";
import { leadMatches, alertCriteria } from "./matching";
import { notifyMany, type NotifyEntry } from "../notify";
import { sendEmail } from "../email/mailer";
import { agentLeadAlert } from "../email/templates";
import { sendWhatsAppTemplate } from "../whatsapp/client";
import { agentLeadAlertTemplate } from "../whatsapp/templates";

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3100";
}

/**
 * Notifies agents whose alert preferences match a newly-created lead. Best-effort.
 *
 * Fan-out shape — three independent channels, each opt-in per agent:
 * - In-app notifications go through a single `createMany` insert (was N inserts).
 * - Email sends are Promise.allSettled'd (was awaited one-by-one). SMTP is the
 *   slow part of this function; one 800ms send used to block the next one.
 * - WhatsApp template messages, same parallel treatment. Requires the agent
 *   to have opted in (`alertWhatsapp`) AND to have a usable phone number;
 *   the client skips silently when the number can't be normalised.
 *
 * Nothing here is allowed to throw — an alert failure must never roll back
 * or block the lead that triggered it.
 */
export async function runLeadAlerts(leadId: string): Promise<void> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const prefs = await prisma.agentPreference.findMany({
      where: { OR: [{ alertInApp: true }, { alertEmail: true }, { alertWhatsapp: true }] },
      include: { agent: { include: { user: true } } },
    });

    const title = `New matching lead — ${lead.destinationText}`;
    // No ₹ in agent-facing alert bodies — agents work in credits only.
    const body = `${lead.tripCategory ? lead.tripCategory + " · " : ""}Quality ${lead.quality}`;

    const inApp: NotifyEntry[] = [];
    const outbound: Promise<unknown>[] = [];

    for (const pref of prefs) {
      if (pref.agent.status === "SUSPENDED" || pref.agent.status === "REJECTED") continue;
      if (!leadMatches(lead, alertCriteria(pref))) continue;
      if (process.env.NODE_ENV !== "production") {
        console.log("[alerts] leadId=%s alertAgentId=%s", leadId, pref.agentId);
      }

      if (pref.alertInApp) {
        inApp.push({ userId: pref.agent.userId, type: "lead", title, body, href: "/agent/leads" });
      }
      if (pref.alertEmail && pref.agent.user.email) {
        const t = agentLeadAlert({
          agentName: pref.agent.user.name,
          destination: lead.destinationText,
          tripCategory: lead.tripCategory,
          budget: lead.budget,
          quality: lead.quality,
          url: `${appUrl()}/agent/leads`,
        });
        outbound.push(sendEmail({ to: pref.agent.user.email, ...t, category: "leads" }));
      }
      if (pref.alertWhatsapp) {
        // Prefer the business contact number, fall back to the account phone.
        const phone = pref.agent.contactNo || pref.agent.phone;
        const agentName = pref.agent.user.name;
        outbound.push(
          // Template lookup is async (reads admin-edited copy), so build and
          // send inside one promise rather than awaiting serially per agent.
          agentLeadAlertTemplate({
            agentName,
            tripCategory: lead.tripCategory,
            destination: lead.destinationText,
            quality: lead.quality,
          }).then((tpl) => sendWhatsAppTemplate(phone, tpl, "lead_alert", { leadId })),
        );
      }
    }

    await Promise.allSettled([notifyMany(inApp), ...outbound]);
  } catch (e) {
    console.error("[alerts] failed", e);
  }
}
