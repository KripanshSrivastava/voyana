import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { SUPPORT_STATUSES } from "@/lib/constants";

/** Admin changes a support ticket's status. Restricted to the "support" area. */
export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "support");
  const { id } = await ctx.params;
  const { status } = await req.json();
  if (!SUPPORT_STATUSES.includes(status)) return fail("Invalid status.", 422);

  await prisma.supportTicket.update({ where: { id }, data: { status } });
  return ok({ id, status });
});
