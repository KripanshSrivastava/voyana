import { handler, ok, fail } from "@/lib/api";
import { leadSchema } from "@/lib/validation";
import { ingestLead } from "@/lib/leads/ingest";
import { logIntegration } from "@/lib/integrations/log";

/**
 * Authenticated internal lead API for partner sites, landing pages and apps.
 * Auth: `x-api-key: <VOYANA_API_KEY>` or `Authorization: Bearer <VOYANA_API_KEY>`.
 * Body: same shape as the public lead form, plus optional
 *   source, sourceType, externalId (for idempotent partner ingestion).
 */
export const POST = handler(async (req: Request) => {
  const configured = process.env.VOYANA_API_KEY;
  if (!configured) return fail("Lead API is not configured on this server.", 503);

  const header = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (header !== configured) {
    await logIntegration({ integration: "api", event: "auth", status: "FAILED", message: "Invalid API key" });
    return fail("Invalid API key.", 401);
  }

  const body = await req.json();
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed.", 422, { issues: parsed.error.flatten() });
  const d = parsed.data;

  const { lead, alreadyExisted } = await ingestLead({
    customerName: d.customerName,
    phone: d.phone,
    email: d.email || null,
    destinationText: d.destinationText,
    departureCity: d.departureCity || null,
    travelDate: d.travelDate || null,
    travelers: d.travelers ?? null,
    budget: d.budget ?? null,
    tripType: d.tripType || null,
    requirements: d.requirements ?? [],
    message: d.message || null,
    source: typeof body.source === "string" && body.source ? body.source : "partner",
    sourceType: typeof body.sourceType === "string" && body.sourceType ? body.sourceType : "api",
    externalId: typeof body.externalId === "string" ? body.externalId : null,
    attribution: d.attribution,
  });

  return ok({ id: lead.id, code: lead.code, duplicate: alreadyExisted });
});
