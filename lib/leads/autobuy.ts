import "server-only";
import { prisma } from "../db";
import { purchaseLead } from "./purchase";
import { leadMatches, autoBuyCriteria } from "./matching";
import { notify } from "../notify";
import { logAudit } from "../audit";
import { sendEmail } from "../email/mailer";
import { agentAutoLeadPurchased } from "../email/templates";

/**
 * Runs auto-buy for a lead that has just become purchasable (priced + available).
 * Reuses the same atomic purchaseLead transaction — there is NO separate unsafe
 * path. Every safety condition is checked before purchase; the 2-agent cap and
 * wallet guard are enforced inside the transaction. Best-effort: one agent's
 * failure never affects others or the caller.
 */
export async function runAutoBuyForLead(leadId: string): Promise<void> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.price == null || lead.price <= 0) return;
    if (lead.assignmentCount >= lead.maxAgents) return;

    const prefs = await prisma.agentPreference.findMany({
      where: { autoBuyEnabled: true },
      include: { agent: { include: { creditBalance: true, user: true } } },
    });

    for (const pref of prefs) {
      // Re-check capacity each iteration (earlier auto-buys may have filled it).
      const current = await prisma.lead.findUnique({ where: { id: leadId }, select: { assignmentCount: true, maxAgents: true, price: true } });
      if (!current || current.price == null || current.assignmentCount >= current.maxAgents) break;

      const agent = pref.agent;
      const price = current.price;

      // --- Safety gates (before touching credits) ---
      if (agent.status !== "APPROVED") continue;                       // active
      if (agent.verificationStatus !== "VERIFIED") continue;           // verified
      if (!leadMatches(lead, autoBuyCriteria(pref))) continue;         // matches filters (destination/category/client location)
      if ((agent.creditBalance?.balance ?? 0) < 1) continue;           // needs at least 1 Lead Credit — consumeCreditsInTx re-checks atomically inside purchaseLead

      // already holds this lead?
      const held = await prisma.leadAssignment.findUnique({ where: { leadId_agentId: { leadId, agentId: agent.id } } });
      if (held) continue;

      if (process.env.NODE_ENV !== "production") {
        console.log("[autobuy] leadId=%s autoBuyAgentId=%s", leadId, agent.id);
      }

      // --- Purchase via the shared atomic transaction ---
      try {
        await purchaseLead({ leadId, agentId: agent.id, actor: "AGENT", actorLabel: `${agent.companyName} (auto-buy)` });
        await notify({ userId: agent.userId, type: "purchase", title: `Auto-purchased lead ${lead.code}`, body: `${lead.destinationText} · ₹${price.toLocaleString("en-IN")}. Customer details are now available.`, href: `/agent/leads/${leadId}` });
        if (agent.user.email) {
          try {
            await sendEmail({
              to: agent.user.email,
              ...agentAutoLeadPurchased({
                agentName: agent.user.name,
                code: lead.code,
                destination: lead.destinationText,
                price,
                travelDate: lead.travelDate ? lead.travelDate.toISOString().slice(0, 10) : lead.travelDateText ?? null,
                travelers: lead.travelers ?? null,
                budget: lead.budget ?? null,
                quality: lead.quality,
              }),
            });
          } catch (e) {
            console.error("[autobuy] email failed (non-fatal)", e);
          }
        }
        await logAudit({ actorType: "SYSTEM", action: "lead.autobuy", entityType: "lead", entityId: leadId, metadata: { agentId: agent.id, price } });
      } catch {
        // Race lost, insufficient funds at commit, cap filled — skip this agent.
      }
    }
  } catch (e) {
    console.error("[autobuy] failed", e);
  }
}
