import { prisma } from "../db";
import { consumeCreditsInTx } from "../credits";

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
 * - agent must have at least 1 Lead Credit
 * Any failure rolls the whole transaction back.
 */
export async function purchaseLead(opts: {
  leadId: string;
  agentId: string;
  actor: "AGENT" | "ADMIN";
  actorLabel?: string;
}) {
  const { leadId, agentId, actor, actorLabel } = opts;

  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUnique({ where: { id: agentId }, include: { creditBalance: true } });
    if (!agent) throw new PurchaseError("Agent not found.", 404);
    if (agent.status !== "APPROVED") throw new PurchaseError("Your account is not approved for purchases yet.", 403);
    if ((agent.creditBalance?.balance ?? 0) < 1) throw new PurchaseError("You need Lead Credits to purchase this lead.", 402);

    const lead = await tx.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new PurchaseError("Lead not found.", 404);
    if (lead.price == null || lead.price <= 0) throw new PurchaseError("This lead is not priced for sale yet.", 400);
    if (lead.expiresAt && lead.expiresAt < new Date()) throw new PurchaseError("This lead has expired.", 410);

    const price = lead.price;

    const existing = await tx.leadAssignment.findUnique({
      where: { leadId_agentId: { leadId, agentId } },
    });
    if (existing) throw new PurchaseError("You have already purchased this lead.", 409);

    const cap = await tx.lead.updateMany({
      where: { id: leadId, assignmentCount: { lt: lead.maxAgents } },
      data: { assignmentCount: { increment: 1 } },
    });
    if (cap.count === 0) throw new PurchaseError("This lead is fully distributed.", 409);

    const assignment = await tx.leadAssignment.create({
      data: { leadId, agentId, price, status: "PURCHASED" },
    });
    await tx.leadPayment.create({ data: { leadId, agentId, amount: price } });

    const creditBalance = await consumeCreditsInTx(tx, agentId, 1, `Purchased Lead ${lead.code}`, {
      referenceId: leadId,
      leadAssignmentId: assignment.id,
      leadId,
    }).catch((e) => {
      if (e instanceof Error && e.message === "INSUFFICIENT_CREDITS") {
        throw new PurchaseError("You need Lead Credits to purchase this lead.", 402);
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
    await tx.leadStatusHistory.create({
      data: {
        leadId,
        toStatus: fresh.status,
        actorType: actor,
        actorLabel,
        note: `${actor === "ADMIN" ? "Assigned" : "Purchased"} by ${agent.companyName} using 1 Lead Credit`,
      },
    });

    return { assignmentCount: fresh.assignmentCount, price, creditsUsed: 1, creditBalance };
  });
}
