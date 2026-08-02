import { parseJson } from "../utils";

const QUALITY_RANK: Record<string, number> = { UNREVIEWED: 0, POOR: 1, AVERAGE: 2, GOOD: 3, EXCELLENT: 4 };
export function qualityRank(q: string | null | undefined): number {
  return QUALITY_RANK[q ?? "UNREVIEWED"] ?? 0;
}

export type MatchableLead = {
  destinationText: string;
  clientLocation: string | null;
  departureCity: string | null;
  tripCategory: string | null;
  quality: string;
  budget: number | null;
};

export type MatchCriteria = {
  categories?: string[] | null;
  destinations?: string[] | null;
  clientLocations?: string[] | null;
  minQuality?: string | null;
  minBudget?: number | null;
};

function anyKeyword(haystack: string | null | undefined, keywords: string[]): boolean {
  const h = (haystack ?? "").toLowerCase();
  return keywords.some((k) => k.trim() && h.includes(k.trim().toLowerCase()));
}

/** Does a lead satisfy an alert/auto-buy rule? Empty/absent criteria are wildcards. */
export function leadMatches(lead: MatchableLead, c: MatchCriteria): boolean {
  if (c.categories?.length && !(lead.tripCategory && c.categories.includes(lead.tripCategory))) return false;
  if (c.destinations?.length && !anyKeyword(lead.destinationText, c.destinations)) return false;
  if (c.clientLocations?.length && !anyKeyword(lead.clientLocation ?? lead.departureCity, c.clientLocations)) return false;
  if (c.minQuality && qualityRank(lead.quality) < qualityRank(c.minQuality)) return false;
  if (c.minBudget != null && (lead.budget ?? 0) < c.minBudget) return false;
  return true;
}

/** Reads an alert rule off an AgentPreference row. */
export function alertCriteria(pref: {
  alertCategories: string | null; alertDestinations: string | null;
  alertMinQuality: string | null; alertMinBudget: number | null;
}): MatchCriteria {
  return {
    categories: parseJson<string[]>(pref.alertCategories, []),
    destinations: parseJson<string[]>(pref.alertDestinations, []),
    minQuality: pref.alertMinQuality,
    minBudget: pref.alertMinBudget,
  };
}

/** Reads an auto-buy rule off an AgentPreference row. */
export function autoBuyCriteria(pref: {
  autoBuyCategories: string | null; autoBuyDestinations: string | null;
  autoBuyClientLocations: string | null; autoBuyMinQuality: string | null;
}): MatchCriteria {
  return {
    categories: parseJson<string[]>(pref.autoBuyCategories, []),
    destinations: parseJson<string[]>(pref.autoBuyDestinations, []),
    clientLocations: parseJson<string[]>(pref.autoBuyClientLocations, []),
    minQuality: pref.autoBuyMinQuality,
  };
}
