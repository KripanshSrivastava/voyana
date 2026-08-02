import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export const GET = handler(async () => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);

  const [balance, ledger, purchases] = await Promise.all([
    prisma.agentCreditBalance.findUnique({ where: { agentId: session.agentId } }),
    prisma.leadCreditLedger.findMany({ where: { agentId: session.agentId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.leadCreditPurchase.findMany({ where: { agentId: session.agentId }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return ok({
    credits: balance?.balance ?? 0,
    transactions: ledger,
    packagePurchases: purchases,
  });
});
