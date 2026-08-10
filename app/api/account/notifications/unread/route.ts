import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";

/**
 * Cheap unread-count endpoint used by the sidebar badge that polls every 30s.
 * Returning the full notification list (up to 100 rows × ~7 fields) just to
 * read one integer was the previous behaviour — this route ships only the
 * count so the poll is effectively free on the wire.
 */
export const GET = handler(async () => {
  const session = await requireRole("AGENT", "ADMIN");
  const unread = await prisma.notification.count({ where: { userId: session.uid, read: false } });
  return ok({ unread });
});
