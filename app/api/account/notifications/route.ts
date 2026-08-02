import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export const GET = handler(async () => {
  const session = await requireRole("AGENT", "ADMIN");
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: session.uid }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.notification.count({ where: { userId: session.uid, read: false } }),
  ]);

  return ok({
    items,
    unread,
    total: items.length,
  });
});