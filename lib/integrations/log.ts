import "server-only";
import { prisma } from "../db";

/** Records an integration event (webhook ingest, verify, email, etc.). Never throws. */
export async function logIntegration(entry: {
  integration: "google" | "meta" | "api" | "email" | "payment";
  event: string;
  status: "SUCCESS" | "FAILED" | "DUPLICATE";
  leadId?: string | null;
  externalId?: string | null;
  message?: string | null;
}): Promise<void> {
  try {
    await prisma.integrationLog.create({
      data: {
        integration: entry.integration,
        event: entry.event,
        status: entry.status,
        leadId: entry.leadId ?? null,
        externalId: entry.externalId ?? null,
        message: entry.message?.slice(0, 500) ?? null,
      },
    });
  } catch (e) {
    console.error("[integration-log] failed", entry.integration, entry.event, e);
  }
}
