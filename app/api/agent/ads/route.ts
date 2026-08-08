import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getFlags } from "@/lib/flags";
import { TRIP_CATEGORIES } from "@/lib/constants";

/** Vendor creates an advertisement (DRAFT). Gated behind the vendor_ads flag. */
export const POST = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  if (!(await getFlags()).vendorAdsEnabled) return fail("Vendor advertising is not available yet.", 403);

  const b = await req.json();
  if (typeof b.title !== "string" || b.title.trim().length < 3) return fail("Enter an ad title.", 422);

  // Landing URL validation — server-side, since a client could POST anything.
  // Empty string is OK (optional field); otherwise it must parse as a URL
  // and use http/https to prevent javascript:/data: injection when the URL
  // is rendered as an <a href> in the admin review page.
  let landingUrl: string | null = null;
  if (typeof b.landingUrl === "string" && b.landingUrl.trim().length > 0) {
    const raw = b.landingUrl.trim();
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return fail("Landing URL must start with https:// (or http://).", 422);
      }
      landingUrl = parsed.toString().slice(0, 300);
    } catch {
      return fail("Landing URL is not a valid URL.", 422);
    }
  }

  const ad = await prisma.vendorAd.create({
    data: {
      agentId: session.agentId,
      title: b.title.trim().slice(0, 120),
      description: typeof b.description === "string" ? b.description.slice(0, 1000) : null,
      landingUrl,
      destination: typeof b.destination === "string" ? b.destination.slice(0, 120) : null,
      clientLocation: typeof b.clientLocation === "string" ? b.clientLocation.slice(0, 120) : null,
      category: TRIP_CATEGORIES.includes(b.category) ? b.category : null,
      // maxBid and dailyBudget cannot be negative — same reasoning as lead
      // pricing (see lib/validation.ts::settingsSchema). Server enforces
      // even if the input has min={0}.
      dailyBudget: b.dailyBudget != null ? Math.max(0, Math.round(Number(b.dailyBudget)) || 0) : null,
      maxBid: b.maxBid != null ? Math.max(0, Math.round(Number(b.maxBid)) || 0) : null,
      startDate: b.startDate ? new Date(b.startDate) : null,
      endDate: b.endDate ? new Date(b.endDate) : null,
      status: b.submit ? "PENDING" : "DRAFT", // submit for review, or save as draft
    },
  });
  return ok({ id: ad.id, status: ad.status });
});
