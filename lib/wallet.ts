import "server-only";
import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

/**
 * Atomically credits an agent's wallet and writes a ledger row. Returns the new
 * balance. All wallet mutations must go through a transaction like this — never
 * a bare balance write.
 */
export async function creditWallet(agentId: string, amount: number, description: string, opts?: { leadId?: string }): Promise<number> {
  if (amount <= 0) throw new Error("Credit amount must be positive");
  return prisma.$transaction(async (tx) => {
    return creditWalletInTx(tx, agentId, amount, description, opts);
  });
}

export async function creditWalletInTx(
  tx: Prisma.TransactionClient,
  agentId: string,
  amount: number,
  description: string,
  opts?: { leadId?: string }
): Promise<number> {
  if (amount <= 0) throw new Error("Credit amount must be positive");
  const wallet = await tx.agentWallet.upsert({
    where: { agentId },
    create: { agentId, balance: 0 },
    update: {},
  });
  const balanceAfter = wallet.balance + amount;
  await tx.agentWallet.update({ where: { agentId }, data: { balance: balanceAfter } });
  await tx.walletTransaction.create({
    data: { walletId: wallet.id, agentId, type: "CREDIT", amount, balanceAfter, description, leadId: opts?.leadId ?? null },
  });
  return balanceAfter;
}
