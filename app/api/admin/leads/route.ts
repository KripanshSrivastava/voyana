import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { adminLeadSchema } from "@/lib/validation";
import { scoreLead } from "@/lib/leads/scoring";
import { generateLeadCode } from "@/lib/leads/code";
import { getSiteSettings } from "@/lib/settings";
import { LEAD_STATUSES } from "@/lib/constants";

/** Admin manually creates a lead (walk-in / phone-in). */
export const POST = handler(async (req: Request) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "leads");
  const d = adminLeadSchema.parse(await req.json());
  const settings = await getSiteSettings();

  const requirements = d.requirements ?? [];
  const travelDate = d.travelDate ? new Date(d.travelDate) : null;
  const status = d.status && (LEAD_STATUSES as readonly string[]).includes(d.status) ? d.status : "QUALIFIED";

  const { score, quality } = scoreLead({
    phone: d.phone,
    email: d.email || null,
    destinationText: d.destinationText,
    travelDate,
    budget: d.budget ?? null,
    travelers: d.travelers ?? null,
    requirements,
    message: d.message || null,
    utmSource: d.source || "manual",
  });

  const expiresAt = new Date(Date.now() + settings.leadExpiryHours * 60 * 60 * 1000);

  for (let attempt = 0; attempt < 4; attempt++) {
    const code = await generateLeadCode();
    try {
      const lead = await prisma.lead.create({
        data: {
          code,
          customerName: d.customerName,
          phone: d.phone,
          email: d.email || null,
          destinationText: d.destinationText,
          departureCity: d.departureCity || null,
          travelDate,
          travelers: d.travelers ?? null,
          budget: d.budget ?? null,
          tripType: d.tripType || null,
          requirements: JSON.stringify(requirements),
          message: d.message || null,
          status,
          quality,
          qualityScore: score,
          price: d.price ?? null,
          maxAgents: settings.leadMaxAgents,
          expiresAt,
          destinationId: d.destinationId || null,
          utmSource: d.source || "manual",
          statusHistory: {
            create: { toStatus: status, actorType: "ADMIN", actorLabel: session.name, note: "Lead created manually by admin" },
          },
        },
        select: { id: true, code: true },
      });
      return ok(lead);
    } catch {
      if (attempt === 3) return fail("Could not create lead. Please try again.", 500);
    }
  }
  return fail("Could not create lead.", 500);
});
