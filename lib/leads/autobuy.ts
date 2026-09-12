import "server-only";
import { prisma } from "../db";
import { purchaseLead } from "./purchase";
import { leadMatches, autoBuyCriteria } from "./matching";
import { requiresExclusive, exclusiveEligible } from "./pricing";
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

    // Defensive: no lead type is currently exclusive-only (requiresExclusive()
    // always returns false). If that policy ever comes back, purchaseLead()'s
    // own transaction still rejects a SHARED purchase on such a lead — the
    // per-agent purchaseType choice below is what actually matters.
    const leadRequiresExclusive = requiresExclusive(lead.tripCategory);

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

      // Agent-chosen purchase type. EXCLUSIVE requires the lead still be
      // fully fresh (no existing assignments) — otherwise it wouldn't
      // actually be exclusive, so skip this agent rather than silently
      // downgrading to SHARED without their consent.
      const wantsExclusive = pref.autoBuyPurchaseType === "EXCLUSIVE" || leadRequiresExclusive;
      if (wantsExclusive && !exclusiveEligible(current.assignmentCount)) continue;
      const purchaseType = wantsExclusive ? "EXCLUSIVE" : "SHARED";

      if (process.env.NODE_ENV !== "production") {
        console.log("[autobuy] leadId=%s autoBuyAgentId=%s purchaseType=%s", leadId, agent.id, purchaseType);
      }

      // --- Purchase via the shared atomic transaction ---
      try {
        const purchase = await purchaseLead({ leadId, agentId: agent.id, actor: "AGENT", actorLabel: `${agent.companyName} (auto-buy)`, purchaseType });
        // Use the server-computed price from the purchase result — the local
        // `price` variable was read from lead.price which may be stale.
        const charged = purchase.price;
        const chargedCredits = Math.max(1, Math.floor(charged));
        await notify({ userId: agent.userId, type: "purchase", title: `Auto-purchased lead ${lead.code}`, body: `${lead.destinationText} · ${chargedCredits.toLocaleString("en-IN")} Credit${chargedCredits === 1 ? "" : "s"}. Customer details are now available.`, href: `/agent/leads/${leadId}` });
        if (agent.user.email) {
          try {
            await sendEmail({
              to: agent.user.email,
              ...agentAutoLeadPurchased({
                agentName: agent.user.name,
                code: lead.code,
                destination: lead.destinationText,
                price: charged,
                travelDate: lead.travelDate ? lead.travelDate.toISOString().slice(0, 10) : lead.travelDateText ?? null,
                travelers: lead.travelers ?? null,
                budget: lead.budget ?? null,
                quality: lead.quality,
              }),
              category: "leads",
            });
          } catch (e) {
            console.error("[autobuy] email failed (non-fatal)", e);
          }
        }
        await logAudit({ actorType: "SYSTEM", action: "lead.autobuy", entityType: "lead", entityId: leadId, metadata: { agentId: agent.id, price: charged } });
      } catch (e) {
        // Race lost, insufficient funds at commit, cap filled — skip this
        // agent, but log it: this used to be a silent catch, which made
        // auto-buy failures invisible even when every agent was failing.
        console.error("[autobuy] purchase attempt failed for agentId=%s leadId=%s:", agent.id, leadId, e);
      }
    }
  } catch (e) {
    console.error("[autobuy] failed", e);
  }
}
