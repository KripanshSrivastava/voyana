import "server-only";
import { prisma } from "../db";
import { leadMatches, alertCriteria } from "./matching";
import { notify } from "../notify";
import { sendEmail } from "../email/mailer";

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

      const title = `New matching lead — ${lead.destinationText}`;
      const body = `${lead.tripCategory ? lead.tripCategory + " · " : ""}Budget ${lead.budget ? "₹" + lead.budget.toLocaleString("en-IN") : "—"} · Quality ${lead.quality}`;
      if (pref.alertInApp) await notify({ userId: pref.agent.userId, type: "lead", title, body, href: "/agent/leads" });
      if (pref.alertEmail && pref.agent.user.email) {
        await sendEmail({ to: pref.agent.user.email, subject: title, html: `<p>${body}</p><p>View available leads in your Voyana portal.</p>` });
      }
    }
  } catch (e) {
    console.error("[alerts] failed", e);
  }
}
