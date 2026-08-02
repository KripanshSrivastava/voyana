import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("AGENT", "ADMIN");
  const { id } = await ctx.params;
  await prisma.notification.updateMany({ where: { id, userId: session.uid }, data: { read: true } });
  return ok({ done: true });
});