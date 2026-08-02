import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { addCreditsInTx, CREDIT_LEDGER_TYPES } from "@/lib/credits";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "support");
  const { id } = await ctx.params;

  const report = await prisma.spamReport.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, code: true, destinationText: true, budget: true, price: true, travelDate: true, travelers: true } },
      agent: { include: { user: { select: { name: true, email: true } }, wallet: true, creditBalance: true } },
      leadAssignment: true,
    },
  });
  if (!report) return fail("Spam report not found.", 404);
  return ok(report);
});

export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("ADMIN");
  const body = await req.json();
  const { id } = await ctx.params;
  const action = String(body.action || body.status || "").toUpperCase();
  const report = await prisma.spamReport.findUnique({ where: { id }, include: { agent: { include: { user: true, wallet: true } }, leadAssignment: true, lead: true } });
  if (!report) return fail("Spam report not found.", 404);

  if (action === "REJECT") {
    requireArea(session, "support");
    if (report.status !== "PENDING") return fail("Spam report has already been reviewed.", 409);
    await prisma.spamReport.update({ where: { id }, data: { status: "REJECTED", reviewedAt: new Date(), reviewedBy: session.uid, resolution: "none" } });
    await logAudit({ actorType: "ADMIN", actorId: session.uid, actorLabel: session.name, action: "spam.reject", entityType: "lead", entityId: report.leadId, metadata: { spamReportId: id } });
    await notify({ userId: report.agent.userId, type: "system", title: `Spam report rejected - ${report.lead.code}`, body: `Your report for ${report.lead.destinationText} was reviewed and rejected.`, href: "/agent/notifications" });
    return ok({ id, status: "REJECTED" });
  }

  if (action === "APPROVE") {
    requireArea(session, "finance");
    const refundAmount = 1;

    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.spamReport.updateMany({
        where: { id, status: "PENDING", refundedAt: null },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedBy: session.uid,
          resolution: "credit",
          refundAmount,
          refundedAt: new Date(),
        },
      });
      if (claim.count === 0) throw Object.assign(new Error("Spam report has already been reviewed."), { status: 409 });

      const balanceAfter = await addCreditsInTx(tx, report.agentId, refundAmount, CREDIT_LEDGER_TYPES.REFUND, `Spam refund for ${report.lead.code}`, {
        referenceId: id,
        leadAssignmentId: report.leadAssignmentId,
        leadId: report.leadId,
      });

      const lastTxn = await tx.leadCreditLedger.findFirst({ where: { agentId: report.agentId, leadId: report.leadId, type: CREDIT_LEDGER_TYPES.REFUND }, orderBy: { createdAt: "desc" } });
      await tx.spamReport.update({ where: { id }, data: { refundWalletTransactionId: lastTxn?.id ?? null } });
      return { balanceAfter };
    });

    await logAudit({ actorType: "ADMIN", actorId: session.uid, actorLabel: session.name, action: "spam.refund", entityType: "wallet", entityId: report.agentId, metadata: { spamReportId: id, leadId: report.leadId, refundCredits: refundAmount } });
    await notify({ userId: report.agent.userId, type: "wallet", title: `Spam refund approved - ${report.lead.code}`, body: "1 Lead Credit has been returned to your account.", href: "/agent/wallet" });
    return ok({ id, status: "APPROVED", refundAmount, balanceAfter: result.balanceAfter });
  }

  return fail("Invalid spam review action.", 422);
});
