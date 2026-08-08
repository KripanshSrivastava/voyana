import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { approveManualOrder } from "@/lib/credits/manual-payment";

/**
 * Idempotent by design: approveManualOrder uses a conditional-update on
 * status=PENDING_REVIEW, so double-clicking Approve grants credits exactly
 * once. See lib/credits/manual-payment.ts::approveManualOrder for the
 * atomicity guarantees. Admin cannot approve their own account's order —
 * finance area membership is required and it's an admin-only route.
 */
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "finance");
  const { id } = await ctx.params;
  const result = await approveManualOrder(id, { adminUserId: session.uid, adminName: session.name });
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") return fail("Order not found.", 404);
    if (result.reason === "NOT_MANUAL") return fail("This order was not a manual payment.", 400);
    return fail("This order is not in a state that can be approved.", 409);
  }
  return ok({ approved: true, alreadyApproved: result.alreadyApproved, newBalance: "newBalance" in result ? result.newBalance : undefined });
});
