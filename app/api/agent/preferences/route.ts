import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, 50) : []);
const intOrNull = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n) : null; };

/** Load the vendor's alert + auto-buy preferences. */
export const GET = handler(async () => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const pref = await prisma.agentPreference.findUnique({ where: { agentId: session.agentId } });
  return ok({ pref });
});

/** Save the vendor's alert + auto-buy preferences (upsert). */
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
    alertCategories: JSON.stringify(arr(b.alertCategories)),
    alertDestinations: JSON.stringify(arr(b.alertDestinations)),
    alertMinQuality: typeof b.alertMinQuality === "string" ? b.alertMinQuality : null,
    alertMinBudget: intOrNull(b.alertMinBudget),
    autoBuyEnabled,
    autoBuyCategories: JSON.stringify(arr(b.autoBuyCategories)),
    autoBuyDestinations: JSON.stringify(arr(b.autoBuyDestinations)),
    autoBuyClientLocations: JSON.stringify(arr(b.autoBuyClientLocations)),
    autoBuyMinQuality: typeof b.autoBuyMinQuality === "string" ? b.autoBuyMinQuality : null,
    autoBuyMaxPrice: intOrNull(b.autoBuyMaxPrice),
    autoBuyDailyLimit: intOrNull(b.autoBuyDailyLimit),
    autoBuyMonthlyBudget: intOrNull(b.autoBuyMonthlyBudget),
  };

  await prisma.agentPreference.upsert({
    where: { agentId: session.agentId },
    create: { agentId: session.agentId, ...data },
    update: data,
  });
  return ok({ saved: true, autoBuyEnabled });
});
