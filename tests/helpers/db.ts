import { PrismaClient } from "@prisma/client";

/**
 * Fresh Prisma client per test file so we don't share connection pools across
 * suites. `env.ts` has already repointed DATABASE_URL at the test DB.
 */
export const prisma = new PrismaClient({
  log: ["error"],
  transactionOptions: { timeout: 20_000, maxWait: 10_000 },
});

/**
 * Truncate every table the purchase flow touches. Ordered child → parent to
 * respect foreign keys, and only touches tables tests actually populate.
 * We deliberately do NOT truncate `SiteSetting` — tests upsert the singleton
 * once at file setup, and re-truncating between tests would race.
 */
export async function resetTestData(): Promise<void> {
  await prisma.$transaction([
    prisma.leadCreditLedger.deleteMany({}),
    prisma.leadAssignmentStatusHistory.deleteMany({}),
    prisma.leadAssignment.deleteMany({}),
    prisma.leadPayment.deleteMany({}),
    prisma.leadStatusHistory.deleteMany({}),
    prisma.leadNote.deleteMany({}),
    prisma.spamReport.deleteMany({}),
    prisma.lead.deleteMany({}),
    prisma.walletTransaction.deleteMany({}),
    prisma.walletTopup.deleteMany({}),
    prisma.leadCreditPurchase.deleteMany({}),
    prisma.agentCreditBalance.deleteMany({}),
    prisma.agentWallet.deleteMany({}),
    prisma.agentPreference.deleteMany({}),
    prisma.agent.deleteMany({}),
    prisma.notification.deleteMany({}),
    prisma.verificationToken.deleteMany({}),
    prisma.auditLog.deleteMany({}),
    prisma.integrationLog.deleteMany({}),
    prisma.user.deleteMany({ where: { role: { not: "SYSTEM_KEEP" } } }),
  ]);
}
