import "server-only";
import { prisma } from "../db";
import { leadMatches, alertCriteria } from "./matching";
import { notifyMany, type NotifyEntry } from "../notify";
import { sendEmail } from "../email/mailer";
import { agentLeadAlert } from "../email/templates";

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3100";
}

/**
 * Notifies agents whose alert preferences match a newly-created lead. Best-effort.
 *
 * Fan-out shape:
 * - In-app notifications go through a single `createMany` insert (was N inserts).
 * - Email sends are Promise.allSettled'd (was awaited one-by-one). SMTP is the
 *   slow part of this function; one 800ms send used to block the next one.
 */
export async function runLeadAlerts(leadId: string): Promise<void> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const prefs = await prisma.agentPreference.findMany({
      where: { OR: [{ alertInApp: true }, { alertEmail: true }] },
      include: { agent: { include: { user: true } } },
    });

    const title = `New matching lead — ${lead.destinationText}`;
    // No ₹ in agent-facing alert bodies — agents work in credits only.
    const body = `${lead.tripCategory ? lead.tripCategory + " · " : ""}Quality ${lead.quality}`;

    const inApp: NotifyEntry[] = [];
    const emails: Promise<unknown>[] = [];

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
        emails.push(sendEmail({ to: pref.agent.user.email, ...t, category: "leads" }));
      }
    }

    await Promise.allSettled([notifyMany(inApp), ...emails]);
  } catch (e) {
    console.error("[alerts] failed", e);
  }
}
