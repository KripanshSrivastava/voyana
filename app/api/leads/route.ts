import { handler, ok, fail } from "@/lib/api";
import { leadSchema } from "@/lib/validation";
import { ingestLead, detectWebsiteSource } from "@/lib/leads/ingest";
import { rateLimit, rateLimitResponse, ipFromRequest } from "@/lib/rate-limit";

/**
 * Public website lead form.
 *
 * Rate limiting — this endpoint is fully public and has no CAPTCHA or
 * client-side token, so two layers of Redis throttling protect it:
 *
 *  1. **IP** — 20 submissions per 10 minutes. Catches single-host spammers
 *     and bots iterating through a form fill.
 *  2. **Phone number** — 3 submissions per hour for the exact same phone.
 *     Catches campaigns that rotate IPs but reuse a phone (a common bot
 *     pattern), and prevents a well-meaning user from accidentally spamming
 *     the enquiry pipeline by mashing Submit.
 *
 * Both fail OPEN if Redis is unreachable. The dedup + idempotency logic in
 * `ingestLead()` provides a final backstop: even if throttling is bypassed,
 * duplicate leads within `leadExpiryHours` are flagged (not dropped) and
 * webhook replays with the same (source, externalId) return the original.
 */
export const POST = handler(async (req: Request) => {
  const ip = ipFromRequest(req);
  const ipLimit = await rateLimit({ key: `leads:ip:${ip}`, windowSeconds: 60 * 10, max: 20 });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit);

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

  // Second rate-limit gate: same phone number can't submit more than 3× / hour.
  // Normalise to digits-only so `+91 98…` vs `9198…` still collide.
  const phoneKey = d.phone.replace(/\D/g, "");
  if (phoneKey) {
    const phoneLimit = await rateLimit({ key: `leads:phone:${phoneKey}`, windowSeconds: 60 * 60, max: 3 });
    if (!phoneLimit.allowed) return rateLimitResponse(phoneLimit, "You've already sent a few enquiries. We'll be in touch — please wait before submitting again.");
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
