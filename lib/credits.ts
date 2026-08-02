import "server-only";
import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

export const CREDIT_LEDGER_TYPES = {
  PURCHASE: "CREDIT_PURCHASE",
  LEAD_PURCHASE: "LEAD_PURCHASE",
  REFUND: "CREDIT_REFUND",
  ADMIN_ADJUSTMENT: "ADMIN_ADJUSTMENT",
} as const;

type CreditLedgerType = (typeof CREDIT_LEDGER_TYPES)[keyof typeof CREDIT_LEDGER_TYPES];

export async function getCreditBalance(agentId: string): Promise<number> {
  const balance = await prisma.agentCreditBalance.findUnique({ where: { agentId } });
  return balance?.balance ?? 0;
}

export async function ensureCreditBalanceInTx(tx: Prisma.TransactionClient, agentId: string) {
  return tx.agentCreditBalance.upsert({
    where: { agentId },
    create: { agentId, balance: 0 },
    update: {},
  });
}

export async function addCreditsInTx(
  tx: Prisma.TransactionClient,
  agentId: string,
  credits: number,
  type: CreditLedgerType,
  description: string,
  opts?: {
    referenceId?: string | null;
    packageId?: string | null;
    leadAssignmentId?: string | null;
    leadId?: string | null;
    adminId?: string | null;
  }
): Promise<number> {
  if (!Number.isInteger(credits) || credits <= 0) throw new Error("Credit amount must be a positive integer");
  await ensureCreditBalanceInTx(tx, agentId);
  const updated = await tx.agentCreditBalance.update({
    where: { agentId },
    data: { balance: { increment: credits } },
  });
  await tx.leadCreditLedger.create({
    data: {
      agentId,
      creditAmount: credits,
      balanceAfter: updated.balance,
      type,
      description,
      referenceId: opts?.referenceId ?? null,
      packageId: opts?.packageId ?? null,
      leadAssignmentId: opts?.leadAssignmentId ?? null,
      leadId: opts?.leadId ?? null,
      adminId: opts?.adminId ?? null,
    },
  });
  return updated.balance;
}

export async function consumeCreditsInTx(
  tx: Prisma.TransactionClient,
  agentId: string,
  credits: number,
  description: string,
  opts?: {
    type?: CreditLedgerType;
    referenceId?: string | null;
    leadAssignmentId?: string | null;
    leadId?: string | null;
    adminId?: string | null;
  }
): Promise<number> {
  if (!Number.isInteger(credits) || credits <= 0) throw new Error("Credit amount must be a positive integer");
  await ensureCreditBalanceInTx(tx, agentId);
  const paid = await tx.agentCreditBalance.updateMany({
    where: { agentId, balance: { gte: credits } },
    data: { balance: { decrement: credits } },
  });
  if (paid.count === 0) throw new Error("INSUFFICIENT_CREDITS");
  const updated = await tx.agentCreditBalance.findUniqueOrThrow({ where: { agentId } });
  await tx.leadCreditLedger.create({
    data: {
      agentId,
      creditAmount: -credits,
      balanceAfter: updated.balance,
      type: opts?.type ?? CREDIT_LEDGER_TYPES.LEAD_PURCHASE,
      description,
      referenceId: opts?.referenceId ?? null,
      leadAssignmentId: opts?.leadAssignmentId ?? null,
      leadId: opts?.leadId ?? null,
      adminId: opts?.adminId ?? null,
    },
  });
  return updated.balance;
}

export async function addCredits(
  agentId: string,
  credits: number,
  type: CreditLedgerType,
  description: string,
  opts?: Parameters<typeof addCreditsInTx>[5]
): Promise<number> {
  return prisma.$transaction((tx) => addCreditsInTx(tx, agentId, credits, type, description, opts));
}
