import "server-only";
import { prisma } from "./db";

export type NotifyEntry = {
  userId: string;
  type: "verification" | "wallet" | "lead" | "purchase" | "support" | "system";
  title: string;
  body?: string;
  href?: string;
};

/** Creates an in-app notification. Best-effort — never throws, so it can't break
 *  the action that triggered it. Email fan-out (where enabled) happens separately. */
export async function notify(entry: NotifyEntry): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId: entry.userId, type: entry.type, title: entry.title, body: entry.body ?? null, href: entry.href ?? null },
    });
  } catch (e) {
    console.error("[notify] failed", entry.type, e);
  }
}

/** Bulk insert — one round-trip instead of N. Best-effort; failures don't
 *  break the caller. Prefer this from fan-out paths (lead alerts, moderation
 *  broadcasts) that would otherwise loop `notify()`. */
export async function notifyMany(entries: NotifyEntry[]): Promise<void> {
  if (entries.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: entries.map((e) => ({
        userId: e.userId,
        type: e.type,
        title: e.title,
        body: e.body ?? null,
        href: e.href ?? null,
      })),
    });
  } catch (e) {
    console.error("[notify] bulk failed", e);
  }
}
