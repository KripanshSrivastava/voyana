import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getFlags } from "@/lib/flags";
import { PageHeader } from "@/components/admin/ui";
import { PreferencesForm, type PrefValue } from "@/components/agent/PreferencesForm";
import { parseJson } from "@/lib/utils";

export default async function PreferencesPage() {
  const { agent } = await requireAgent();
  const [pref, flags] = await Promise.all([
    prisma.agentPreference.findUnique({ where: { agentId: agent.id } }),
    getFlags(),
  ]);

  const initial: PrefValue = {
    alertEmail: pref?.alertEmail ?? true,
    alertInApp: pref?.alertInApp ?? true,
    alertWhatsapp: pref?.alertWhatsapp ?? false,
    alertCategories: parseJson<string[]>(pref?.alertCategories ?? null, []),
    alertDestinations: parseJson<string[]>(pref?.alertDestinations ?? null, []).join(", "),
    alertMinQuality: pref?.alertMinQuality ?? "",
    alertMinBudget: pref?.alertMinBudget != null ? String(pref.alertMinBudget) : "",
    alertMaxBudget: pref?.alertMaxBudget != null ? String(pref.alertMaxBudget) : "",
    autoBuyEnabled: pref?.autoBuyEnabled ?? false,
    autoBuyCategories: parseJson<string[]>(pref?.autoBuyCategories ?? null, []),
    autoBuyDestinations: parseJson<string[]>(pref?.autoBuyDestinations ?? null, []).join(", "),
    autoBuyClientLocations: parseJson<string[]>(pref?.autoBuyClientLocations ?? null, []).join(", "),
    autoBuyMinQuality: pref?.autoBuyMinQuality ?? "",
    autoBuyMinBudget: pref?.autoBuyMinBudget != null ? String(pref.autoBuyMinBudget) : "",
    autoBuyMaxBudget: pref?.autoBuyMaxBudget != null ? String(pref.autoBuyMaxBudget) : "",
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Alerts & Auto-Buy" subtitle="Choose which leads you're notified about — and which to buy automatically." />
      <PreferencesForm initial={initial} autoBuyAllowed={flags.autoBuyEnabled} />
    </div>
  );
}
