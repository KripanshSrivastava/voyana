import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { AGENT_STATUSES, VERIFICATION_STATUSES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email/mailer";
import { agentApproved } from "@/lib/email/templates";
import { titleCase } from "@/lib/utils";
import { revalidateVendors } from "@/lib/cache/revalidate";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "vendors");
  const { id } = await ctx.params;
  const body = await req.json();

  const agent = await prisma.agent.findUnique({ where: { id }, include: { user: true } });
  if (!agent) return fail("Agent not found.", 404);

  // --- Verification action (admin-only; vendor can never self-verify) ---
  if (body.verification) {
    const vStatus = body.verification.status as string;
    const notes = typeof body.verification.notes === "string" ? body.verification.notes.slice(0, 1000) : null;
    if (!VERIFICATION_STATUSES.includes(vStatus as (typeof VERIFICATION_STATUSES)[number])) {
      return fail("Invalid verification status.", 422);
    }
    const verified = vStatus === "VERIFIED";
    await prisma.agent.update({
      where: { id },
      data: {
        verificationStatus: vStatus,
        verificationNotes: notes,
        verifiedAt: verified ? new Date() : null,
        verifiedBy: verified ? session.uid : null,
      },
    });
    revalidateVendors();
    await logAudit({ actorType: "ADMIN", actorId: session.uid, actorLabel: session.name, action: "agent.verify", entityType: "agent", entityId: id, metadata: { from: agent.verificationStatus, to: vStatus } });
    await notify({
      userId: agent.userId,
      type: "verification",
      title: verified ? "You're a Verified Partner ✓" : `Verification ${titleCase(vStatus)}`,
      body: notes || (verified ? "Your account has been verified by the Moksh Booking team." : undefined),
      href: "/agent/profile",
    });
    return ok({ id, verificationStatus: vStatus });
  }

  // --- Account status action ---
  const { status } = body;
  if (!AGENT_STATUSES.includes(status)) return fail("Invalid status.", 422);

  await prisma.agent.update({ where: { id }, data: { status } });
  revalidateVendors();
  await logAudit({ actorType: "ADMIN", actorId: session.uid, actorLabel: session.name, action: "agent.status", entityType: "agent", entityId: id, metadata: { from: agent.status, to: status } });
  await notify({ userId: agent.userId, type: "system", title: `Account ${titleCase(status)}`, href: "/agent/dashboard" });

  if (status === "APPROVED" && agent.status !== "APPROVED" && agent.user.email) {
    try {
      await sendEmail({ to: agent.user.email, ...agentApproved({ agentName: agent.user.name }), category: "account" });
    } catch (e) {
      console.error("[agent] approval email failed (non-fatal)", e);
    }
  }
  return ok({ id, status });
});
