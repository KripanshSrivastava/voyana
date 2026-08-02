import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getFlags } from "@/lib/flags";
import { SUPPORT_CATEGORIES } from "@/lib/constants";

/** Vendor creates a support ticket with an opening message. */
export const POST = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  if (!(await getFlags()).supportEnabled) return fail("Support is currently unavailable.", 403);

  const { subject, category, message } = await req.json();
  if (typeof subject !== "string" || subject.trim().length < 3) return fail("Enter a subject.", 422);
  if (typeof message !== "string" || message.trim().length < 3) return fail("Describe your issue.", 422);
  const cat = SUPPORT_CATEGORIES.includes(category) ? category : "general";

  const ticket = await prisma.supportTicket.create({
    data: {
      agentId: session.agentId,
      subject: subject.trim().slice(0, 160),
      category: cat,
      status: "OPEN",
      messages: { create: { authorType: "AGENT", authorLabel: session.name, body: message.trim().slice(0, 4000) } },
    },
  });
  return ok({ id: ticket.id });
});
