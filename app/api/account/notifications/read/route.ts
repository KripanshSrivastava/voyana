import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";

/** Mark one notification (by id) or all of the user's notifications as read. */
export const POST = handler(async (req: Request) => {
  const session = await requireRole("AGENT", "ADMIN");
  const body = await req.json().catch(() => ({}));

  if (body.all) {
    await prisma.notification.updateMany({ where: { userId: session.uid, read: false }, data: { read: true } });
  } else if (typeof body.id === "string") {
    // Scope to the owner so one user can't mark another's notifications.
    await prisma.notification.updateMany({ where: { id: body.id, userId: session.uid }, data: { read: true } });
  }
  return ok({ done: true });
});
