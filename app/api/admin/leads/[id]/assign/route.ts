import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { purchaseLead, PurchaseError } from "@/lib/leads/purchase";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "leads");
  const { id } = await ctx.params;
  const { agentId } = await req.json();
  if (!agentId) return fail("Select an agent to assign.", 422);

  try {
    const result = await purchaseLead({ leadId: id, agentId, actor: "ADMIN", actorLabel: session.name });
    return ok(result);
  } catch (e) {
    if (e instanceof PurchaseError) return fail(e.message, e.status);
    throw e;
  }
});
