import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { runAutoBuyForAgent } from "@/lib/leads/autobuy";

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, 50) : []);

function purchaseType(v: unknown): "SHARED" | "EXCLUSIVE" {
  return v === "SHARED" ? "SHARED" : "EXCLUSIVE";
}

/** Load the vendor's alert + auto-buy preferences. */
export const GET = handler(async () => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const pref = await prisma.agentPreference.findUnique({ where: { agentId: session.agentId } });
  return ok({ pref });
});

/**
 * Save the vendor's alert + auto-buy preferences (upsert).
 *
 * Fields accepted:
 * - `alertCategories`, `alertDestinations` — legacy string-list filters
 * - `autoBuyCategories`, `autoBuyDestinations`, `autoBuyClientLocations`
 *
 * Minimum-quality and trip-budget filters were removed from this form.
 * Explicitly nulled below (not just omitted) — a plain `upsert` leaves
 * untouched fields as-is, so any row saved before this removal would
 * otherwise keep silently filtering on stale values forever.
 */
export const PUT = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const b = await req.json();
  const settings = await getSiteSettings();

  // Respect the global auto-buy feature flag.
  const autoBuyEnabled = settings.autoBuyEnabled ? Boolean(b.autoBuyEnabled) : false;

  const data = {
    alertEmail: Boolean(b.alertEmail),
    alertInApp: b.alertInApp === undefined ? true : Boolean(b.alertInApp),
    alertWhatsapp: Boolean(b.alertWhatsapp),
    alertCategories: JSON.stringify(arr(b.alertCategories)),
    alertDestinations: JSON.stringify(arr(b.alertDestinations)),
    alertMinQuality: null,
    alertMinBudget: null,
    alertMaxBudget: null,
    autoBuyEnabled,
    autoBuyPurchaseType: purchaseType(b.autoBuyPurchaseType),
    autoBuyCategories: JSON.stringify(arr(b.autoBuyCategories)),
    autoBuyDestinations: JSON.stringify(arr(b.autoBuyDestinations)),
    autoBuyClientLocations: JSON.stringify(arr(b.autoBuyClientLocations)),
    autoBuyMinQuality: null,
    autoBuyMinBudget: null,
    autoBuyMaxBudget: null,
  };

  await prisma.agentPreference.upsert({
    where: { agentId: session.agentId },
    create: { agentId: session.agentId, ...data },
    update: data,
  });

  // Auto-buy previously only ran against brand-new leads as they arrived —
  // an agent turning it on (or widening their filters) got nothing until
  // the next fresh enquiry. Fire-and-forget a pass over the existing
  // marketplace backlog too, so it takes effect immediately.
  if (autoBuyEnabled) {
    void runAutoBuyForAgent(session.agentId).catch((e) =>
      console.error("[preferences] backlog auto-buy failed for agentId=%s:", session.agentId, e),
    );
  }

  return ok({ saved: true, autoBuyEnabled });
});
