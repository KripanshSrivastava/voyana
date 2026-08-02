import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ASSIGNMENT_STATUSES } from "@/lib/constants";
import { ASSIGNMENT_STATUS_TRANSITIONS } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const { id } = await ctx.params;
  const { status, bookedValue, bookingNotes, reason } = await req.json();

  if (!ASSIGNMENT_STATUSES.includes(status)) return fail("Invalid status.", 422);

  const assignment = await prisma.leadAssignment.findUnique({
    where: { leadId_agentId: { leadId: id, agentId: session.agentId } },
    include: { lead: true },
  });
  if (!assignment) return fail("You have not purchased this lead.", 403);
  if (assignment.status === status) return ok({ status });

  const allowed = ASSIGNMENT_STATUS_TRANSITIONS[assignment.status as keyof typeof ASSIGNMENT_STATUS_TRANSITIONS] ?? [];
  if (!allowed.includes(status)) return fail(`Invalid status transition from ${assignment.status} to ${status}.`, 422);

  const isBooked = status === "BOOKED";
  await prisma.$transaction(async (tx) => {
    await tx.leadAssignment.update({
      where: { id: assignment.id },
      data: {
        status,
        ...(isBooked ? {
          bookedAt: new Date(),
          bookedValue: bookedValue != null && bookedValue !== "" ? Math.round(Number(bookedValue)) || null : null,
          bookingNotes: typeof bookingNotes === "string" ? bookingNotes.slice(0, 500) || null : null,
        } : {}),
      },
    });

    await tx.leadAssignmentStatusHistory.create({
      data: {
        assignmentId: assignment.id,
        oldStatus: assignment.status,
        newStatus: status,
        changedBy: session.uid,
        reason: typeof reason === "string" ? reason.slice(0, 500) || null : null,
      },
    });
  });

  // If an agent books/wins, reflect conversion at the lead level.
  if ((status === "WON" || status === "BOOKED") && assignment.lead.status !== "CONVERTED") {
    await prisma.lead.update({ where: { id }, data: { status: "CONVERTED" } });
    await prisma.leadStatusHistory.create({
      data: { leadId: id, fromStatus: assignment.lead.status, toStatus: "CONVERTED", actorType: "SYSTEM", note: "Lead converted (agent marked won)" },
    });
  }

  return ok({ status });
});
