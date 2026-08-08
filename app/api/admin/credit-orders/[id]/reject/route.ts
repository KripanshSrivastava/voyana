import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { rejectManualOrder } from "@/lib/credits/manual-payment";

export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "finance");
  const { id } = await ctx.params;
  const { reason } = await req.json().catch(() => ({}));
  if (typeof reason !== "string" || reason.trim().length < 3) return fail("Enter a reason for rejection.", 422);
  const result = await rejectManualOrder(id, { adminUserId: session.uid, adminName: session.name }, reason);
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") return fail("Order not found.", 404);
    return fail("This order is not in a state that can be rejected.", 409);
  }
  return ok({ rejected: true });
});
