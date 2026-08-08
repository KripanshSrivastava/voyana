import "server-only";
import { prisma } from "../db";
import { addCreditsInTx, CREDIT_LEDGER_TYPES } from "../credits";
import { logAudit } from "../audit";
import { notify } from "../notify";

/**
 * Manual QR-based credit-purchase workflow.
 *
 * We deliberately reuse the existing LeadCreditPurchase table for these
 * orders (see prisma/schema.prisma) — it already carries agent+plan+price
 * and the atomic accounting is already integrated with the credit ledger.
 * Extended fields: paymentScreenshotUrl, transactionReference, reviewedById,
 * reviewedAt, rejectionReason. Status vocabulary widened to
 * PENDING_REVIEW | APPROVED | REJECTED | CANCELLED for the manual flow.
 *
 * There is NO payment gateway integration. Credits are only ever granted
 * inside approveManualOrder() after a human admin clicks Approve.
 *
 * Idempotency: approveManualOrder uses a conditional update
 * (status: "PENDING_REVIEW") so double-clicking Approve grants credits
 * exactly once — the second call finds the row already APPROVED and no-ops.
 */

/** Generate MKB-YYYYMMDD-XXXXXX order code. YYYYMMDD is server-local date;
 *  the 6-char suffix is derived from the created row's ID so it's
 *  deterministic per-row and unique. */
export function formatOrderCode(row: { id: string; createdAt: Date }): string {
  const d = row.createdAt;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const suffix = row.id.slice(-6).toUpperCase();
  return `MKB-${yyyy}${mm}${dd}-${suffix}`;
}

export type CreateManualOrderInput = {
  agentId: string;
  packageId: string;
  transactionReference: string;
  paymentScreenshotUrl: string;
};

export type CreateManualOrderResult =
  | { ok: true; orderId: string; orderCode: string }
  | { ok: false; reason: "PACKAGE_INACTIVE" | "PACKAGE_NOT_FOUND" };

/**
 * Records a new manual payment order. The plan (price + credits) is
 * ALWAYS re-read from the database — never trusted from the client — so
 * an agent forging planId=<other> or amount=1 in the request payload is
 * neutralized here.
 */
export async function createManualOrder(input: CreateManualOrderInput): Promise<CreateManualOrderResult> {
  const pkg = await prisma.leadCreditPackage.findUnique({ where: { id: input.packageId } });
  if (!pkg) return { ok: false, reason: "PACKAGE_NOT_FOUND" };
  if (!pkg.isActive) return { ok: false, reason: "PACKAGE_INACTIVE" };

  // Two-step create: we need the row's id + createdAt to build the order
  // code, so we create with a temporary orderId then update.
  const row = await prisma.leadCreditPurchase.create({
    data: {
      agentId: input.agentId,
      packageId: pkg.id,
      packageName: pkg.name,
      credits: pkg.credits,
      priceInr: pkg.priceInr,
      provider: "manual",
      status: "PENDING_REVIEW",
      transactionReference: input.transactionReference.trim().slice(0, 120),
      paymentScreenshotUrl: input.paymentScreenshotUrl,
      // Placeholder to satisfy the @unique constraint until we compute the
      // real order code (which needs the row's id). Immediately overwritten.
      orderId: `TMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
    select: { id: true, createdAt: true },
  });
  const orderCode = formatOrderCode(row);
  await prisma.leadCreditPurchase.update({
    where: { id: row.id },
    data: { orderId: orderCode },
  });
  return { ok: true, orderId: row.id, orderCode };
}

export type ApproveResult =
  | { ok: true; alreadyApproved: false; newBalance: number }
  | { ok: true; alreadyApproved: true }
  | { ok: false; reason: "NOT_FOUND" | "WRONG_STATUS" | "NOT_MANUAL" };

/**
 * Approves a pending manual order and adds credits atomically. Idempotent:
 * approving an already-approved order returns alreadyApproved=true without
 * granting credits again.
 *
 * The whole thing runs in one Prisma transaction so that:
 * 1) the status transitions from PENDING_REVIEW → APPROVED,
 * 2) credits are added to AgentCreditBalance,
 * 3) a LeadCreditLedger row is written,
 * either all succeed or none do.
 */
export async function approveManualOrder(orderId: string, reviewer: { adminUserId: string; adminName: string }): Promise<ApproveResult> {
  const existing = await prisma.leadCreditPurchase.findUnique({ where: { id: orderId }, select: { id: true, agentId: true, credits: true, packageId: true, packageName: true, priceInr: true, orderId: true, status: true, provider: true } });
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (existing.provider !== "manual") return { ok: false, reason: "NOT_MANUAL" };
  if (existing.status === "APPROVED") return { ok: true, alreadyApproved: true };
  if (existing.status !== "PENDING_REVIEW") return { ok: false, reason: "WRONG_STATUS" };

  try {
    const balance = await prisma.$transaction(async (tx) => {
      // Conditional update: only flips if the row is still PENDING_REVIEW.
      // If another admin approved it a millisecond ago, this returns 0 and
      // we treat it as already-approved (idempotent).
      const flipped = await tx.leadCreditPurchase.updateMany({
        where: { id: orderId, status: "PENDING_REVIEW" },
        data: {
          status: "APPROVED",
          reviewedById: reviewer.adminUserId,
          reviewedAt: new Date(),
          paidAt: new Date(),
        },
      });
      if (flipped.count === 0) {
        // Race lost — another admin already approved. Bail out of tx so
        // the outer catch can convert to alreadyApproved. Throwing here
        // aborts the transaction cleanly.
        throw new Error("__ALREADY_APPROVED__");
      }

      const newBalance = await addCreditsInTx(
        tx,
        existing.agentId,
        existing.credits,
        CREDIT_LEDGER_TYPES.PURCHASE,
        `${existing.packageName} — order ${existing.orderId}`,
        { referenceId: orderId, packageId: existing.packageId, adminId: reviewer.adminUserId },
      );
      return newBalance;
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: reviewer.adminUserId,
      actorLabel: reviewer.adminName,
      action: "credit-order.approve",
      entityType: "wallet",
      entityId: orderId,
      metadata: { credits: existing.credits, priceInr: existing.priceInr, orderCode: existing.orderId },
    });
    await notify({
      userId: (await prisma.agent.findUnique({ where: { id: existing.agentId }, select: { userId: true } }))!.userId,
      type: "wallet",
      title: "Credits added",
      body: `${existing.credits.toLocaleString("en-IN")} Lead Credits added to your account (order ${existing.orderId}).`,
      href: "/agent/wallet",
    });
    return { ok: true, alreadyApproved: false, newBalance: balance };
  } catch (e) {
    if (e instanceof Error && e.message === "__ALREADY_APPROVED__") {
      return { ok: true, alreadyApproved: true };
    }
    throw e;
  }
}

export type RejectResult = { ok: true } | { ok: false; reason: "NOT_FOUND" | "WRONG_STATUS" };

export async function rejectManualOrder(orderId: string, reviewer: { adminUserId: string; adminName: string }, reason: string): Promise<RejectResult> {
  const trimmedReason = reason.trim().slice(0, 500) || "No reason provided";
  const flipped = await prisma.leadCreditPurchase.updateMany({
    where: { id: orderId, status: "PENDING_REVIEW", provider: "manual" },
    data: {
      status: "REJECTED",
      reviewedById: reviewer.adminUserId,
      reviewedAt: new Date(),
      rejectionReason: trimmedReason,
    },
  });
  if (flipped.count === 0) {
    const still = await prisma.leadCreditPurchase.findUnique({ where: { id: orderId }, select: { id: true } });
    return { ok: false, reason: still ? "WRONG_STATUS" : "NOT_FOUND" };
  }
  const order = await prisma.leadCreditPurchase.findUnique({ where: { id: orderId }, select: { orderId: true, agentId: true } });
  if (order) {
    await logAudit({
      actorType: "ADMIN",
      actorId: reviewer.adminUserId,
      actorLabel: reviewer.adminName,
      action: "credit-order.reject",
      entityType: "wallet",
      entityId: orderId,
      metadata: { reason: trimmedReason, orderCode: order.orderId },
    });
    const agent = await prisma.agent.findUnique({ where: { id: order.agentId }, select: { userId: true } });
    if (agent) {
      await notify({
        userId: agent.userId,
        type: "wallet",
        title: "Payment rejected",
        body: `Order ${order.orderId} was rejected: ${trimmedReason}`,
        href: "/agent/wallet",
      });
    }
  }
  return { ok: true };
}
