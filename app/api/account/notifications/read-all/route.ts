import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export const POST = handler(async () => {
  const session = await requireRole("AGENT", "ADMIN");
  await prisma.notification.updateMany({ where: { userId: session.uid, read: false }, data: { read: true } });
  return ok({ done: true });
});