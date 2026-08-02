import "server-only";
import { prisma } from "./db";

/** Creates an in-app notification. Best-effort — never throws, so it can't break
 *  the action that triggered it. Email fan-out (where enabled) happens separately. */
export async function notify(entry: {
  userId: string;
  type: "verification" | "wallet" | "lead" | "purchase" | "support" | "system";
  title: string;
  body?: string;
  href?: string;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId: entry.userId, type: entry.type, title: entry.title, body: entry.body ?? null, href: entry.href ?? null },
    });
  } catch (e) {
    console.error("[notify] failed", entry.type, e);
  }
}
