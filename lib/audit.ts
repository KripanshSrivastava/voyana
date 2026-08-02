import "server-only";
import { prisma } from "./db";

/**
 * Records a sensitive action to the audit log. Best-effort — never throws,
 * so it can't break the operation it is auditing.
 */
export async function logAudit(entry: {
  actorType: "ADMIN" | "AGENT" | "SYSTEM";
  actorId?: string | null;
  actorLabel?: string | null;
  action: string;
  entityType: "lead" | "agent" | "wallet" | "integration" | "cms";
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        actorLabel: entry.actorLabel ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      },
    });
  } catch (e) {
    console.error("[audit] failed to record", entry.action, e);
  }
}
