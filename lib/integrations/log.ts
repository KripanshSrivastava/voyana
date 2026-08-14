import "server-only";
import { prisma } from "../db";

/** Records an integration event (webhook ingest, verify, email, etc.). Never throws.
 *
 *  Note `whatsapp` is distinct from `meta`: the latter is Meta Lead Ads
 *  ingestion, the former is outbound Cloud API messaging. They fail for
 *  completely different reasons, so keeping them separate makes
 *  /admin/integrations/logs actually useful when triaging. The DB column is
 *  a plain String, so widening this union needs no migration. */
export async function logIntegration(entry: {
  integration: "google" | "meta" | "api" | "email" | "payment" | "whatsapp";
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
