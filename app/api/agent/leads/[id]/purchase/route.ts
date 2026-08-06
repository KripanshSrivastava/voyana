import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { purchaseLead, PurchaseError } from "@/lib/leads/purchase";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email/mailer";
import { agentLeadPurchased } from "@/lib/email/templates";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const { id } = await ctx.params;

  try {
    const result = await purchaseLead({
      leadId: id,
      agentId: session.agentId,
      actor: "AGENT",
      actorLabel: session.name,
    });

    // Best-effort side effects (never fail the purchase).
    await logAudit({ actorType: "AGENT", actorId: session.agentId, actorLabel: session.name, action: "lead.purchase", entityType: "lead", entityId: id, metadata: { price: result.price } });
    try {
      const lead = await prisma.lead.findUnique({ where: { id }, select: { code: true, destinationText: true } });
      if (lead) {
        await notify({ userId: session.uid, type: "purchase", title: `Lead purchased — ${lead.code}`, body: `${lead.destinationText} · ₹${result.price.toLocaleString("en-IN")}. Customer details are now available.`, href: `/agent/leads/${id}` });
        if (session.email) {
          const t = agentLeadPurchased({ agentName: session.name, code: lead.code, destination: lead.destinationText, price: result.price });
          await sendEmail({ to: session.email, ...t, category: "leads" });
        }
      }
    } catch (e) {
      console.error("[purchase] email failed (non-fatal)", e);
    }

    return ok(result);
  } catch (e) {
    if (e instanceof PurchaseError) return fail(e.message, e.status);
    throw e;
  }
});
