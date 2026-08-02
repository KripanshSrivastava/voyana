import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { SPAM_REASONS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

/** Vendor reports a purchased lead as spam. Does NOT auto-refund — admin reviews. */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const { id } = await ctx.params;
  const { reason, notes } = await req.json();

  if (!SPAM_REASONS.includes(reason)) return fail("Select a valid reason.", 422);

  // Must own the lead to report it.
  const assignment = await prisma.leadAssignment.findUnique({ where: { leadId_agentId: { leadId: id, agentId: session.agentId } } });
  if (!assignment) return fail("You have not purchased this lead.", 403);

  const existing = await prisma.spamReport.findUnique({ where: { leadId_agentId: { leadId: id, agentId: session.agentId } } });
  if (existing) return fail("You have already reported this lead.", 409);

  await prisma.spamReport.create({
    data: { leadId: id, agentId: session.agentId, leadAssignmentId: assignment.id, reason, notes: typeof notes === "string" ? notes.slice(0, 500) : null },
  });
  await prisma.leadAssignment.update({ where: { id: assignment.id }, data: { status: "SPAM" } });
  await prisma.leadAssignmentStatusHistory.create({
    data: { assignmentId: assignment.id, oldStatus: assignment.status, newStatus: "SPAM", changedBy: session.uid, reason: typeof notes === "string" ? notes.slice(0, 500) || null : null },
  });
  await logAudit({ actorType: "AGENT", actorId: session.agentId, actorLabel: session.name, action: "lead.spam_report", entityType: "lead", entityId: id, metadata: { reason } });

  return ok({ reported: true });
});
