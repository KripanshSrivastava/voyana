import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getFlags } from "@/lib/flags";
import { SUPPORT_CATEGORIES } from "@/lib/constants";
import { sendEmail } from "@/lib/email/mailer";
import { supportTicketCreated } from "@/lib/email/templates";

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3100";
}

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

  // Confirmation email — best-effort, must never fail the ticket creation.
  try {
    if (session.email) {
      const t = supportTicketCreated({
        name: session.name,
        subject: subject.trim().slice(0, 160),
        ticketRef: ticket.id.slice(-8).toUpperCase(),
        url: `${appUrl()}/agent/support/${ticket.id}`,
      });
      await sendEmail({ to: session.email, ...t, category: "support" });
    }
  } catch (e) {
    console.error("[support] confirmation email failed (non-fatal)", e);
  }

  return ok({ id: ticket.id });
});
