import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { notify } from "@/lib/notify";

/** Reply to a support ticket. Vendors can only reply to their own tickets;
 *  admins can reply to any and add internal notes. */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("AGENT", "ADMIN");
  const { id } = await ctx.params;
  const { body, internal } = await req.json();
  if (typeof body !== "string" || body.trim().length < 1) return fail("Enter a message.", 422);

  const ticket = await prisma.supportTicket.findUnique({ where: { id }, include: { agent: true } });
  if (!ticket) return fail("Ticket not found.", 404);

  const isAdmin = session.role === "ADMIN";
  if (!isAdmin && ticket.agentId !== session.agentId) return fail("Not your ticket.", 403);

  const isInternal = isAdmin && Boolean(internal);
  await prisma.supportMessage.create({
    data: { ticketId: id, authorType: isAdmin ? "ADMIN" : "AGENT", authorLabel: session.name, body: body.trim().slice(0, 4000), internal: isInternal },
  });

  // Move the ticket forward and notify the other party (skip on internal notes).
  if (!isInternal) {
    const nextStatus = isAdmin ? "WAITING_VENDOR" : "IN_PROGRESS";
    await prisma.supportTicket.update({ where: { id }, data: { status: nextStatus } });
    if (isAdmin) {
      await notify({ userId: ticket.agent.userId, type: "support", title: "Support replied", body: ticket.subject, href: "/agent/support" });
    }
  }
  return ok({ replied: true });
});
