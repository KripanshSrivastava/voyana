import "server-only";
import { prisma } from "../db";
import { leadMatches, alertCriteria } from "./matching";
import { notify } from "../notify";
import { sendEmail } from "../email/mailer";
import { agentLeadAlert } from "../email/templates";

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3100";
}

/** Notifies agents whose alert preferences match a newly-created lead. Best-effort. */
export async function runLeadAlerts(leadId: string): Promise<void> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const prefs = await prisma.agentPreference.findMany({
      where: { OR: [{ alertInApp: true }, { alertEmail: true }] },
      include: { agent: { include: { user: true } } },
    });

    for (const pref of prefs) {
      if (pref.agent.status === "SUSPENDED" || pref.agent.status === "REJECTED") continue;
      if (!leadMatches(lead, alertCriteria(pref))) continue;
      if (process.env.NODE_ENV !== "production") {
        console.log("[alerts] leadId=%s alertAgentId=%s", leadId, pref.agentId);
      }

      const title = `New matching lead — ${lead.destinationText}`;
      // No ₹ in agent-facing alert bodies — agents work in credits only. The
      // customer's own trip budget is hidden here for the same reason: it's
      // rupee-denominated and would put a big ₹ next to a Buy button that
      // charges credits, which reads as confusing at best and misleading at
      // worst. Quality + category still convey how promising the lead is.
      const body = `${lead.tripCategory ? lead.tripCategory + " · " : ""}Quality ${lead.quality}`;
      if (pref.alertInApp) await notify({ userId: pref.agent.userId, type: "lead", title, body, href: "/agent/leads" });
      if (pref.alertEmail && pref.agent.user.email) {
        const t = agentLeadAlert({
          agentName: pref.agent.user.name,
          destination: lead.destinationText,
          tripCategory: lead.tripCategory,
          budget: lead.budget,
          quality: lead.quality,
          url: `${appUrl()}/agent/leads`,
        });
        await sendEmail({ to: pref.agent.user.email, ...t, category: "leads" });
      }
    }
  } catch (e) {
    console.error("[alerts] failed", e);
  }
}
