import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, 50) : []);

/** Load the vendor's alert + auto-buy preferences. */
export const GET = handler(async () => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const pref = await prisma.agentPreference.findUnique({ where: { agentId: session.agentId } });
  return ok({ pref });
});

/**
 * Save the vendor's alert + auto-buy preferences (upsert). Deliberately does
 * NOT accept lead quality, budget, price, daily-limit or monthly-budget
 * fields — those categories were removed from the agent-facing preference
 * system. Only destination/category/client-location matching remains.
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
    alertCategories: JSON.stringify(arr(b.alertCategories)),
    alertDestinations: JSON.stringify(arr(b.alertDestinations)),
    autoBuyEnabled,
    autoBuyCategories: JSON.stringify(arr(b.autoBuyCategories)),
    autoBuyDestinations: JSON.stringify(arr(b.autoBuyDestinations)),
    autoBuyClientLocations: JSON.stringify(arr(b.autoBuyClientLocations)),
  };

  await prisma.agentPreference.upsert({
    where: { agentId: session.agentId },
    create: { agentId: session.agentId, ...data },
    update: data,
  });
  return ok({ saved: true, autoBuyEnabled });
});
