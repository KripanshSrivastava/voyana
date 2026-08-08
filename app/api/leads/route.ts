import { handler, ok, fail } from "@/lib/api";
import { leadSchema } from "@/lib/validation";
import { ingestLead, detectWebsiteSource } from "@/lib/leads/ingest";

/** Public website lead form. Delegates to the unified ingestion pipeline. */
export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Please check your details and try again.", 422, { issues: parsed.error.flatten() });
  }
  const d = parsed.data;
  if (d.leadFormType === "landing-popup") {
    if (!d.email || !d.departureCity || !d.nights) {
      return fail("Please check your details and try again.", 422);
    }
  }
  const source = detectWebsiteSource(d.attribution);
  const requirements = d.leadFormType === "landing-popup" && d.nights
    ? [`${d.nights} nights`, ...(d.requirements ?? []).filter((r) => !/^\d+\s+nights?$/i.test(r))]
    : d.requirements ?? [];

  const { lead } = await ingestLead({
    customerName: d.customerName,
    phone: d.phone,
    email: d.email || null,
    destinationText: d.destinationText,
    departureCity: d.departureCity || null,
    travelDate: d.travelDate || null,
    travelDateText: d.travelDateText || null,
    travelers: d.travelers ?? null,
    adults: d.adults ?? null,
    children: d.children ?? null,
    nights: d.nights ?? null,
    budget: d.budget ?? null,
    tripType: d.tripType || null,
    requirements,
    message: d.message || null,
    source,
    sourceType: "website",
    attribution: d.attribution,
    destinationId: d.destinationId || null,
    packageId: d.packageId || null,
  });

  return ok({ id: lead.id, code: lead.code });
});
