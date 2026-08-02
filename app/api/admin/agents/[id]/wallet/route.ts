import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { addCreditsInTx, consumeCreditsInTx, CREDIT_LEDGER_TYPES } from "@/lib/credits";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "finance");
  const { id } = await ctx.params;
  const { amount, type, note } = await req.json();

  const credits = Math.round(Number(amount));
  const reason = typeof note === "string" ? note.trim() : "";
  if (!Number.isFinite(credits) || credits <= 0) return fail("Enter a valid credit amount.", 422);
  if (type !== "CREDIT" && type !== "DEBIT") return fail("Invalid transaction type.", 422);
  if (!reason) return fail("A reason is required for credit adjustments.", 422);

  const agent = await prisma.agent.findUnique({ where: { id }, include: { user: true, creditBalance: true } });
  if (!agent) return fail("Agent not found.", 404);
  if (type === "DEBIT" && (agent.creditBalance?.balance ?? 0) < credits) {
    return fail("Cannot debit more than the available Lead Credits.", 400);
  }

  const balance = await prisma.$transaction(async (tx) => {
    if (type === "CREDIT") {
      return addCreditsInTx(tx, id, credits, CREDIT_LEDGER_TYPES.ADMIN_ADJUSTMENT, reason, { adminId: session.uid });
    }
    return consumeCreditsInTx(tx, id, credits, reason, { type: CREDIT_LEDGER_TYPES.ADMIN_ADJUSTMENT, referenceId: `admin:${session.uid}`, adminId: session.uid });
  });

  await logAudit({ actorType: "ADMIN", actorId: session.uid, actorLabel: session.name, action: "credits.adjust", entityType: "wallet", entityId: id, metadata: { type, credits, balanceAfter: balance, reason } });
  if (type === "CREDIT") {
    await notify({ userId: agent.userId, type: "wallet", title: "Lead Credits adjusted", body: `${credits.toLocaleString("en-IN")} Lead Credits added by Voyana. New balance ${balance.toLocaleString("en-IN")}.`, href: "/agent/wallet" });
  }

  return ok({ credits: balance });
});
