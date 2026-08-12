import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { prisma, resetTestData } from "./helpers/db";
import { ensureBaselineSettings, makeAgent, makeLead } from "./helpers/fixtures";
import { purchaseLead, PurchaseError } from "../lib/leads/purchase";

/**
 * Integration tests for the atomic lead purchase transaction.
 *
 * These tests hit a REAL Postgres via Prisma so they exercise the actual
 * transaction/locking semantics that `purchaseLead()` relies on. Race
 * scenarios use `Promise.all(...)` against distinct agent ids to trigger
 * genuine concurrent transactions.
 *
 * See tests/README.md for setup and safety guarantees.
 */

beforeAll(async () => {
  await ensureBaselineSettings();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Truncate everything the purchase touches; leave SiteSetting singleton alone.
  await resetTestData();
  // Baseline settings can be dropped between test files, so re-upsert.
  await ensureBaselineSettings();
});

/* -------------------------------------------------------------------------- */
/*  Happy-path                                                                  */
/* -------------------------------------------------------------------------- */

describe("SHARED purchase", () => {
  it("assigns the lead, debits credits, updates counts", async () => {
    const { agent } = await makeAgent({ credits: 5 });
    const lead = await makeLead({ price: 1 });

    const result = await purchaseLead({
      leadId: lead.id,
      agentId: agent.id,
      actor: "AGENT",
      purchaseType: "SHARED",
    });

    expect(result.assignmentCount).toBe(1);
    expect(result.price).toBe(1);
    expect(result.creditsUsed).toBe(1);
    expect(result.creditBalance).toBe(4);
    expect(result.purchaseType).toBe("SHARED");

    const assignment = await prisma.leadAssignment.findFirst({ where: { leadId: lead.id, agentId: agent.id } });
    expect(assignment).toBeTruthy();
    expect(assignment?.status).toBe("PURCHASED");

    const refreshed = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(refreshed?.assignmentCount).toBe(1);
    expect(refreshed?.status).toBe("SHARED");
  });

  it("transitions lead to IN_PROGRESS when the last slot is claimed", async () => {
    const a = await makeAgent({ credits: 5 });
    const b = await makeAgent({ credits: 5 });
    const lead = await makeLead({ price: 1, maxAgents: 2 });

    await purchaseLead({ leadId: lead.id, agentId: a.agent.id, actor: "AGENT", purchaseType: "SHARED" });
    const result = await purchaseLead({ leadId: lead.id, agentId: b.agent.id, actor: "AGENT", purchaseType: "SHARED" });

    expect(result.assignmentCount).toBe(2);
    const refreshed = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(refreshed?.status).toBe("IN_PROGRESS");
  });
});

describe("EXCLUSIVE purchase", () => {
  it("consumes all slots at once and marks the lead IN_PROGRESS", async () => {
    const { agent } = await makeAgent({ credits: 5 });
    const lead = await makeLead({ price: 1, maxAgents: 2 });

    const result = await purchaseLead({
      leadId: lead.id,
      agentId: agent.id,
      actor: "AGENT",
      purchaseType: "EXCLUSIVE",
    });

    expect(result.assignmentCount).toBe(2); // all slots consumed
    expect(result.creditsUsed).toBe(2);     // 2× base
    expect(result.creditBalance).toBe(3);   // 5 - 2

    // Only ONE assignment row was created — the second slot is consumed by count only.
    const rows = await prisma.leadAssignment.count({ where: { leadId: lead.id } });
    expect(rows).toBe(1);

    const refreshed = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(refreshed?.status).toBe("IN_PROGRESS");
  });
});

/* -------------------------------------------------------------------------- */
/*  Race conditions                                                             */
/* -------------------------------------------------------------------------- */

describe("race: two agents on the last slot", () => {
  it("exactly one purchase succeeds when both fire simultaneously", async () => {
    const a = await makeAgent({ credits: 5 });
    const b = await makeAgent({ credits: 5 });
    // Lead already has 1 of 2 slots filled — only ONE more purchase can win.
    const lead = await makeLead({ price: 1, maxAgents: 2, assignmentCount: 1, status: "SHARED" });

    const [ra, rb] = await Promise.allSettled([
      purchaseLead({ leadId: lead.id, agentId: a.agent.id, actor: "AGENT", purchaseType: "SHARED" }),
      purchaseLead({ leadId: lead.id, agentId: b.agent.id, actor: "AGENT", purchaseType: "SHARED" }),
    ]);

    const wins = [ra, rb].filter((r) => r.status === "fulfilled");
    const losses = [ra, rb].filter((r) => r.status === "rejected");
    expect(wins.length).toBe(1);
    expect(losses.length).toBe(1);
    for (const loss of losses) {
      if (loss.status === "rejected") {
        expect(loss.reason).toBeInstanceOf(PurchaseError);
        expect((loss.reason as PurchaseError).status).toBe(409);
      }
    }

    const refreshed = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(refreshed?.assignmentCount).toBe(2);
    const assignments = await prisma.leadAssignment.count({ where: { leadId: lead.id } });
    expect(assignments).toBe(2);
  });

  it("two agents on a fresh 2-slot lead — both succeed", async () => {
    const a = await makeAgent({ credits: 5 });
    const b = await makeAgent({ credits: 5 });
    const lead = await makeLead({ price: 1, maxAgents: 2 });

    const [ra, rb] = await Promise.allSettled([
      purchaseLead({ leadId: lead.id, agentId: a.agent.id, actor: "AGENT", purchaseType: "SHARED" }),
      purchaseLead({ leadId: lead.id, agentId: b.agent.id, actor: "AGENT", purchaseType: "SHARED" }),
    ]);
    expect(ra.status).toBe("fulfilled");
    expect(rb.status).toBe("fulfilled");

    const refreshed = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(refreshed?.assignmentCount).toBe(2);
    expect(refreshed?.status).toBe("IN_PROGRESS");
  });
});

/* -------------------------------------------------------------------------- */
/*  Credit correctness                                                          */
/* -------------------------------------------------------------------------- */

describe("insufficient credits", () => {
  it("rejects with 402 and leaves NO trace: no assignment, no debit, no history", async () => {
    const { agent } = await makeAgent({ credits: 0 });
    const lead = await makeLead({ price: 1 });

    await expect(
      purchaseLead({ leadId: lead.id, agentId: agent.id, actor: "AGENT", purchaseType: "SHARED" }),
    ).rejects.toMatchObject({ status: 402 });

    // Rollback assertions — nothing partially committed.
    const assignments = await prisma.leadAssignment.count({ where: { agentId: agent.id } });
    expect(assignments).toBe(0);

    const debited = await prisma.leadCreditLedger.count({ where: { agentId: agent.id } });
    expect(debited).toBe(0);

    const refreshed = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(refreshed?.assignmentCount).toBe(0);
    expect(refreshed?.status).toBe("QUALIFIED"); // unchanged
  });

  it("rejects EXCLUSIVE if the agent has enough for SHARED but not EXCLUSIVE", async () => {
    const { agent } = await makeAgent({ credits: 1 }); // enough for SHARED (1), not EXCLUSIVE (2)
    const lead = await makeLead({ price: 1 });

    await expect(
      purchaseLead({ leadId: lead.id, agentId: agent.id, actor: "AGENT", purchaseType: "EXCLUSIVE" }),
    ).rejects.toMatchObject({ status: 402 });

    // But SHARED still works with the same credit balance.
    const shared = await purchaseLead({
      leadId: lead.id,
      agentId: agent.id,
      actor: "AGENT",
      purchaseType: "SHARED",
    });
    expect(shared.creditBalance).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/*  Exclusive eligibility                                                       */
/* -------------------------------------------------------------------------- */

describe("EXCLUSIVE eligibility", () => {
  it("rejects EXCLUSIVE on an already-shared lead", async () => {
    const other = await makeAgent({ credits: 5 });
    const buyer = await makeAgent({ credits: 5 });
    const lead = await makeLead({ price: 1 });

    // First agent takes a shared slot.
    await purchaseLead({ leadId: lead.id, agentId: other.agent.id, actor: "AGENT", purchaseType: "SHARED" });

    // Second agent tries to buy exclusive — must be rejected because the lead
    // is no longer exclusively available.
    await expect(
      purchaseLead({ leadId: lead.id, agentId: buyer.agent.id, actor: "AGENT", purchaseType: "EXCLUSIVE" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("EXCLUSIVE succeeds on a fresh lead (assignmentCount === 0)", async () => {
    const { agent } = await makeAgent({ credits: 5 });
    const lead = await makeLead({ price: 1 });
    const result = await purchaseLead({ leadId: lead.id, agentId: agent.id, actor: "AGENT", purchaseType: "EXCLUSIVE" });
    expect(result.purchaseType).toBe("EXCLUSIVE");
    expect(result.assignmentCount).toBe(2);
  });
});

/* -------------------------------------------------------------------------- */
/*  Duplicate purchase                                                          */
/* -------------------------------------------------------------------------- */

describe("duplicate purchase by same agent", () => {
  it("rejects with 409 on the second attempt", async () => {
    const { agent } = await makeAgent({ credits: 10 });
    const lead = await makeLead({ price: 1 });
    await purchaseLead({ leadId: lead.id, agentId: agent.id, actor: "AGENT", purchaseType: "SHARED" });

    await expect(
      purchaseLead({ leadId: lead.id, agentId: agent.id, actor: "AGENT", purchaseType: "SHARED" }),
    ).rejects.toMatchObject({ status: 409 });

    // Only one assignment row + one debit — the failed retry didn't double-charge.
    const assignments = await prisma.leadAssignment.count({ where: { leadId: lead.id, agentId: agent.id } });
    expect(assignments).toBe(1);
    const balance = await prisma.agentCreditBalance.findUnique({ where: { agentId: agent.id } });
    expect(balance?.balance).toBe(9); // 10 - 1
  });
});

/* -------------------------------------------------------------------------- */
/*  Capacity / lifecycle                                                        */
/* -------------------------------------------------------------------------- */

describe("assignment count limit (maxAgents)", () => {
  it("rejects a 3rd purchase on a maxAgents=2 lead", async () => {
    const a = await makeAgent({ credits: 5 });
    const b = await makeAgent({ credits: 5 });
    const c = await makeAgent({ credits: 5 });
    const lead = await makeLead({ price: 1, maxAgents: 2 });

    await purchaseLead({ leadId: lead.id, agentId: a.agent.id, actor: "AGENT", purchaseType: "SHARED" });
    await purchaseLead({ leadId: lead.id, agentId: b.agent.id, actor: "AGENT", purchaseType: "SHARED" });
    await expect(
      purchaseLead({ leadId: lead.id, agentId: c.agent.id, actor: "AGENT", purchaseType: "SHARED" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("respects a custom maxAgents=3", async () => {
    const a = await makeAgent({ credits: 5 });
    const b = await makeAgent({ credits: 5 });
    const c = await makeAgent({ credits: 5 });
    const d = await makeAgent({ credits: 5 });
    const lead = await makeLead({ price: 1, maxAgents: 3 });

    await purchaseLead({ leadId: lead.id, agentId: a.agent.id, actor: "AGENT", purchaseType: "SHARED" });
    await purchaseLead({ leadId: lead.id, agentId: b.agent.id, actor: "AGENT", purchaseType: "SHARED" });
    await purchaseLead({ leadId: lead.id, agentId: c.agent.id, actor: "AGENT", purchaseType: "SHARED" });
    await expect(
      purchaseLead({ leadId: lead.id, agentId: d.agent.id, actor: "AGENT", purchaseType: "SHARED" }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("lead state guards", () => {
  it("rejects when the lead has expired", async () => {
    const { agent } = await makeAgent({ credits: 5 });
    const lead = await makeLead({ price: 1, expiresAt: new Date(Date.now() - 60_000) });
    await expect(
      purchaseLead({ leadId: lead.id, agentId: agent.id, actor: "AGENT", purchaseType: "SHARED" }),
    ).rejects.toMatchObject({ status: 410 });
  });

  it("rejects when the lead has no price", async () => {
    const { agent } = await makeAgent({ credits: 5 });
    const lead = await makeLead({ price: 0 });
    await expect(
      purchaseLead({ leadId: lead.id, agentId: agent.id, actor: "AGENT", purchaseType: "SHARED" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a non-APPROVED agent", async () => {
    const { agent } = await makeAgent({ credits: 5, status: "PENDING" });
    const lead = await makeLead({ price: 1 });
    await expect(
      purchaseLead({ leadId: lead.id, agentId: agent.id, actor: "AGENT", purchaseType: "SHARED" }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

/* -------------------------------------------------------------------------- */
/*  Wallet debit + assignment atomicity                                         */
/* -------------------------------------------------------------------------- */

describe("wallet debit + assignment atomicity", () => {
  it("balance is deducted iff the assignment exists (positive case)", async () => {
    const { agent } = await makeAgent({ credits: 3 });
    const lead = await makeLead({ price: 1 });
    await purchaseLead({ leadId: lead.id, agentId: agent.id, actor: "AGENT", purchaseType: "SHARED" });

    const [assignments, balance, ledgerRows] = await Promise.all([
      prisma.leadAssignment.count({ where: { leadId: lead.id, agentId: agent.id } }),
      prisma.agentCreditBalance.findUnique({ where: { agentId: agent.id } }),
      prisma.leadCreditLedger.findMany({ where: { agentId: agent.id }, orderBy: { createdAt: "asc" } }),
    ]);
    expect(assignments).toBe(1);
    expect(balance?.balance).toBe(2);
    expect(ledgerRows).toHaveLength(1);
    expect(ledgerRows[0].creditAmount).toBe(-1);
    expect(ledgerRows[0].type).toBe("LEAD_PURCHASE");
  });

  it("no partial state when insufficient credits force the tx to abort at the debit step", async () => {
    const { agent } = await makeAgent({ credits: 0 });
    const lead = await makeLead({ price: 1, maxAgents: 2 });

    await expect(
      purchaseLead({ leadId: lead.id, agentId: agent.id, actor: "AGENT", purchaseType: "SHARED" }),
    ).rejects.toBeInstanceOf(PurchaseError);

    // The critical guarantee: no side effects persisted.
    const assignments = await prisma.leadAssignment.count({});
    const payments = await prisma.leadPayment.count({});
    const ledger = await prisma.leadCreditLedger.count({});
    const balance = await prisma.agentCreditBalance.findUnique({ where: { agentId: agent.id } });
    const refreshed = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(assignments).toBe(0);
    expect(payments).toBe(0);
    expect(ledger).toBe(0);
    expect(balance?.balance).toBe(0);
    expect(refreshed?.assignmentCount).toBe(0);
  });
});
