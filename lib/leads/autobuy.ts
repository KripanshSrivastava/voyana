import "server-only";
import type { Agent, AgentCreditBalance, AgentPreference, Lead, User } from "@prisma/client";
import { prisma } from "../db";
import { purchaseLead } from "./purchase";
import { leadMatches, autoBuyCriteria } from "./matching";
import { requiresExclusive, exclusiveEligible } from "./pricing";
import { AVAILABLE_STATUSES } from "../agent/leads";
import { notify } from "../notify";
import { logAudit } from "../audit";
import { sendEmail } from "../email/mailer";
import { agentAutoLeadPurchased } from "../email/templates";

type PrefWithAgent = AgentPreference & {
  agent: Agent & { creditBalance: AgentCreditBalance | null; user: User };
};

/**
 * Attempts to auto-buy ONE lead on behalf of ONE agent preference. Reuses the
 * same atomic purchaseLead transaction — there is NO separate unsafe path.
 * Every safety condition is checked before purchase; the 2-agent cap and
 * wallet guard are enforced inside the transaction. Best-effort: failure
 * here never bubbles up to the caller's loop.
 */
async function attemptAutoBuy(lead: Lead, pref: PrefWithAgent): Promise<void> {
  // Re-fetch capacity/price fresh right before attempting — a prior
  // iteration (another agent, or another lead in a backlog scan) may have
  // just filled this lead's remaining slots.
  const current = await prisma.lead.findUnique({ where: { id: lead.id }, select: { assignmentCount: true, maxAgents: true, price: true } });
  if (!current || current.price == null || current.assignmentCount >= current.maxAgents) return;

  const agent = pref.agent;

  // --- Safety gates (before touching credits) ---
  if (agent.status !== "APPROVED") return;                       // active
  if (agent.verificationStatus !== "VERIFIED") return;            // verified
  if (!leadMatches(lead, autoBuyCriteria(pref))) return;          // matches filters (destination/category/client location)
  if ((agent.creditBalance?.balance ?? 0) < 1) return;            // needs at least 1 Lead Credit — consumeCreditsInTx re-checks atomically inside purchaseLead

  // already holds this lead?
  const held = await prisma.leadAssignment.findUnique({ where: { leadId_agentId: { leadId: lead.id, agentId: agent.id } } });
  if (held) return;

  // Agent-chosen purchase type. EXCLUSIVE requires the lead still be fully
  // fresh (no existing assignments) — otherwise it wouldn't actually be
  // exclusive, so skip this agent rather than silently downgrading to
  // SHARED without their consent.
  // Defensive: no lead type is currently exclusive-only (requiresExclusive()
  // always returns false). If that policy ever comes back, purchaseLead()'s
  // own transaction still rejects a SHARED purchase on such a lead — the
  // per-agent purchaseType choice below is what actually matters.
  const wantsExclusive = pref.autoBuyPurchaseType === "EXCLUSIVE" || requiresExclusive(lead.tripCategory);
  if (wantsExclusive && !exclusiveEligible(current.assignmentCount)) return;
  const purchaseType = wantsExclusive ? "EXCLUSIVE" : "SHARED";

  if (process.env.NODE_ENV !== "production") {
    console.log("[autobuy] leadId=%s autoBuyAgentId=%s purchaseType=%s", lead.id, agent.id, purchaseType);
  }

  // --- Purchase via the shared atomic transaction ---
  try {
    const purchase = await purchaseLead({ leadId: lead.id, agentId: agent.id, actor: "AGENT", actorLabel: `${agent.companyName} (auto-buy)`, purchaseType });
    const charged = purchase.price;
    const chargedCredits = Math.max(1, Math.floor(charged));
    await notify({ userId: agent.userId, type: "purchase", title: `Auto-purchased lead ${lead.code}`, body: `${lead.destinationText} · ${chargedCredits.toLocaleString("en-IN")} Credit${chargedCredits === 1 ? "" : "s"}. Customer details are now available.`, href: `/agent/leads/${lead.id}` });
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
    await logAudit({ actorType: "SYSTEM", action: "lead.autobuy", entityType: "lead", entityId: lead.id, metadata: { agentId: agent.id, price: charged } });
  } catch (e) {
    // Race lost, insufficient funds at commit, cap filled — skip this
    // agent/lead pair, but log it: this used to be a silent catch, which
    // made auto-buy failures invisible even when every attempt was failing.
    console.error("[autobuy] purchase attempt failed for agentId=%s leadId=%s:", agent.id, lead.id, e);
  }
}

/** Runs auto-buy for a lead that has just become purchasable (priced +
 *  available) — tries every auto-buy-enabled agent against it. */
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
      await attemptAutoBuy(lead, pref);
    }
  } catch (e) {
    console.error("[autobuy] failed", e);
  }
}

/**
 * Runs auto-buy for ONE agent against the entire current backlog of
 * already-existing purchasable leads — not just newly-ingested ones. Call
 * this right after an agent turns auto-buy on (or changes their filters),
 * so they don't have to wait for a brand-new lead to arrive before their
 * preferences take effect; existing marketplace leads get picked up too.
 */
export async function runAutoBuyForAgent(agentId: string): Promise<void> {
  try {
    const pref = await prisma.agentPreference.findUnique({
      where: { agentId },
      include: { agent: { include: { creditBalance: true, user: true } } },
    });
    if (!pref || !pref.autoBuyEnabled) return;

    // Bounded batch — this runs in the background off a preferences save,
    // not a request path, but still shouldn't scan an unbounded table.
    // Newest-first so the most recently posted enquiries get priority.
    const candidates = await prisma.lead.findMany({
      where: {
        price: { gt: 0 },
        status: { in: AVAILABLE_STATUSES },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    for (const lead of candidates) {
      if (lead.assignmentCount >= lead.maxAgents) continue;
      await attemptAutoBuy(lead, pref);
    }
  } catch (e) {
    console.error("[autobuy] backlog run failed for agentId=%s:", agentId, e);
  }
}
