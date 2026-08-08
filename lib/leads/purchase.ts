import { prisma } from "../db";
import { consumeCreditsInTx } from "../credits";
import { getSiteSettings } from "../settings";
import { computeLeadCharge, exclusiveEligible, requiresExclusive, type PurchaseType } from "./pricing";

export class PurchaseError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Atomically assigns a lead to an agent, enforcing every business rule:
 * - agent must be APPROVED
 * - lead must exist, be priced, and not expired
 * - assignmentCount < maxAgents, enforced with a conditional update
 * - agent must not already hold this lead
 * - agent has enough Lead Credits for the computed charge (SHARED = base
 *   price, EXCLUSIVE = base × 2, international variants use their own
 *   configured prices — see lib/leads/pricing.ts)
 * - EXCLUSIVE is only allowed on a lead that has no existing assignments
 *   (otherwise it isn't actually exclusive)
 * On EXCLUSIVE success, the lead's assignmentCount is set to maxAgents so
 * no further purchases are possible. Any failure rolls the whole
 * transaction back.
 */
export async function purchaseLead(opts: {
  leadId: string;
  agentId: string;
  actor: "AGENT" | "ADMIN";
  actorLabel?: string;
  purchaseType?: PurchaseType;
}) {
  const { leadId, agentId, actor, actorLabel } = opts;
  const purchaseType: PurchaseType = opts.purchaseType ?? "SHARED";

  // Read settings OUTSIDE the transaction — this is a read-only cache-hit
  // most of the time and doesn't need to hold a DB connection open.
  const settings = await getSiteSettings();

  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUnique({ where: { id: agentId }, include: { creditBalance: true } });
    if (!agent) throw new PurchaseError("Agent not found.", 404);
    if (agent.status !== "APPROVED") throw new PurchaseError("Your account is not approved for purchases yet.", 403);

    const lead = await tx.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new PurchaseError("Lead not found.", 404);
    if (lead.expiresAt && lead.expiresAt < new Date()) throw new PurchaseError("This lead has expired.", 410);

    // Server-computed price — NEVER trust a price sent from the client.
    const { priceInr, credits } = computeLeadCharge({
      tripCategory: lead.tripCategory,
      purchaseType,
      settings,
    });
    if (priceInr <= 0) throw new PurchaseError("This lead is not priced for sale yet.", 400);
    if ((agent.creditBalance?.balance ?? 0) < credits) {
      throw new PurchaseError(`You need ${credits} Lead Credit${credits === 1 ? "" : "s"} to purchase this lead.`, 402);
    }

    // Exclusive can only be bought on a lead that isn't already partially shared.
    if (purchaseType === "EXCLUSIVE" && !exclusiveEligible(lead.assignmentCount)) {
      throw new PurchaseError("This lead has already been shared — exclusive purchase is no longer available.", 409);
    }

    // Some lead types (INTERNATIONAL) are exclusive-only — no shared distribution.
    // Enforced here at the transaction, not just in the UI, so a hand-crafted
    // API request with purchaseType=SHARED on an international lead is rejected.
    if (purchaseType === "SHARED" && requiresExclusive(lead.tripCategory)) {
      throw new PurchaseError("International leads are sold exclusively — please use Buy Exclusive.", 400);
    }

    const existing = await tx.leadAssignment.findUnique({
      where: { leadId_agentId: { leadId, agentId } },
    });
    if (existing) throw new PurchaseError("You have already purchased this lead.", 409);

    // Slot claim. For EXCLUSIVE, jump straight to maxAgents so no more
    // purchases are possible. For SHARED, increment by 1.
    const increment = purchaseType === "EXCLUSIVE" ? lead.maxAgents - lead.assignmentCount : 1;
    const cap = await tx.lead.updateMany({
      where: { id: leadId, assignmentCount: { lt: lead.maxAgents } },
      data: { assignmentCount: { increment } },
    });
    if (cap.count === 0) throw new PurchaseError("This lead is fully distributed.", 409);

    const assignment = await tx.leadAssignment.create({
      data: { leadId, agentId, price: priceInr, status: "PURCHASED" },
    });
    await tx.leadPayment.create({ data: { leadId, agentId, amount: priceInr } });

    const creditBalance = await consumeCreditsInTx(tx, agentId, credits, `Purchased Lead ${lead.code} (${purchaseType})`, {
      referenceId: leadId,
      leadAssignmentId: assignment.id,
      leadId,
    }).catch((e) => {
      if (e instanceof Error && e.message === "INSUFFICIENT_CREDITS") {
        throw new PurchaseError(`You need ${credits} Lead Credit${credits === 1 ? "" : "s"} to purchase this lead.`, 402);
      }
      throw e;
    });

    const fresh = await tx.lead.findUniqueOrThrow({ where: { id: leadId } });
    const newStatus = fresh.assignmentCount >= fresh.maxAgents ? "IN_PROGRESS" : "SHARED";
    if (fresh.status !== newStatus) {
      await tx.lead.update({ where: { id: leadId }, data: { status: newStatus } });
      await tx.leadStatusHistory.create({
        data: { leadId, fromStatus: fresh.status, toStatus: newStatus, actorType: "SYSTEM", note: "Lead distribution updated" },
      });
    }
    const verb = actor === "ADMIN" ? "Assigned" : "Purchased";
    const typeLabel = purchaseType === "EXCLUSIVE" ? "exclusively" : "as shared";
    await tx.leadStatusHistory.create({
      data: {
        leadId,
        toStatus: fresh.status,
        actorType: actor,
        actorLabel,
        note: `${verb} ${typeLabel} by ${agent.companyName} for ₹${priceInr.toLocaleString("en-IN")} (${credits} credit${credits === 1 ? "" : "s"})`,
      },
    });

    return {
      assignmentCount: fresh.assignmentCount,
      price: priceInr,
      creditsUsed: credits,
      creditBalance,
      purchaseType,
    };
  });
}
