import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { LEAD_QUALITIES } from "@/lib/constants";

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, 50) : []);

/** Coerces a body field into a positive integer or null. `null` means "no
 *  filter set" — matcher treats it as a wildcard. */
function optInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** Validates that a quality string is one of the recognised buckets (or null). */
function optQuality(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  return (LEAD_QUALITIES as readonly string[]).includes(v) ? v : null;
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
 * - `alertMinQuality` — one of LEAD_QUALITIES (or null = any)
 * - `alertMinBudget` / `alertMaxBudget` — trip-budget range in rupees
 * - same three-tuple mirrored for `autoBuy…`
 *
 * All are optional — null / empty means "wildcard" in the matcher (see
 * lib/leads/matching.ts).
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
    alertMinQuality: optQuality(b.alertMinQuality),
    alertMinBudget: optInt(b.alertMinBudget),
    alertMaxBudget: optInt(b.alertMaxBudget),
    autoBuyEnabled,
    autoBuyCategories: JSON.stringify(arr(b.autoBuyCategories)),
    autoBuyDestinations: JSON.stringify(arr(b.autoBuyDestinations)),
    autoBuyClientLocations: JSON.stringify(arr(b.autoBuyClientLocations)),
    autoBuyMinQuality: optQuality(b.autoBuyMinQuality),
    autoBuyMinBudget: optInt(b.autoBuyMinBudget),
    autoBuyMaxBudget: optInt(b.autoBuyMaxBudget),
  };

  await prisma.agentPreference.upsert({
    where: { agentId: session.agentId },
    create: { agentId: session.agentId, ...data },
    update: data,
  });
  return ok({ saved: true, autoBuyEnabled });
});
