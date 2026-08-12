import { parseJson } from "../utils";

// Lead quality + trip-budget filters are now part of matching (previously
// they were persisted but ignored). Empty/absent criteria remain wildcards
// so existing vendor preferences don't suddenly stop matching.
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
  /** Minimum acceptable quality bucket. Higher-numbered buckets pass too. */
  minQuality?: string | null;
  /** Trip-budget floor (rupees). null = any. */
  minBudget?: number | null;
  /** Trip-budget ceiling (rupees). null = any. */
  maxBudget?: number | null;
};

function anyKeyword(haystack: string | null | undefined, keywords: string[]): boolean {
  const h = (haystack ?? "").toLowerCase();
  return keywords.some((k) => k.trim() && h.includes(k.trim().toLowerCase()));
}

// Ordered from lowest to highest so we can compare bucket ranks numerically.
// UNREVIEWED is treated as the lowest bucket — a preference requiring at
// least GOOD will filter out UNREVIEWED leads, which is the safe default.
const QUALITY_RANK: Record<string, number> = {
  UNREVIEWED: 0,
  POOR: 1,
  AVERAGE: 2,
  GOOD: 3,
  EXCELLENT: 4,
};

function qualityAtLeast(leadQuality: string, min: string): boolean {
  const l = QUALITY_RANK[leadQuality] ?? 0;
  const m = QUALITY_RANK[min] ?? 0;
  return l >= m;
}

/** Does a lead satisfy an alert/auto-buy rule? Empty/absent criteria are wildcards. */
export function leadMatches(lead: MatchableLead, c: MatchCriteria): boolean {
  if (c.categories?.length && !(lead.tripCategory && c.categories.includes(lead.tripCategory))) return false;
  if (c.destinations?.length && !anyKeyword(lead.destinationText, c.destinations)) return false;
  if (c.clientLocations?.length && !anyKeyword(lead.clientLocation ?? lead.departureCity, c.clientLocations)) return false;
  if (c.minQuality && !qualityAtLeast(lead.quality, c.minQuality)) return false;
  // Budget checks only apply when the lead actually carries a budget.
  // Missing budget on the lead = don't drop it — better a wide net than
  // silently blocking every enquiry that didn't fill the budget field.
  if (lead.budget != null) {
    if (c.minBudget != null && lead.budget < c.minBudget) return false;
    if (c.maxBudget != null && lead.budget > c.maxBudget) return false;
  }
  return true;
}

/** Reads an alert rule off an AgentPreference row. */
export function alertCriteria(pref: {
  alertCategories: string | null; alertDestinations: string | null;
  alertMinQuality?: string | null; alertMinBudget?: number | null; alertMaxBudget?: number | null;
}): MatchCriteria {
  return {
    categories: parseJson<string[]>(pref.alertCategories, []),
    destinations: parseJson<string[]>(pref.alertDestinations, []),
    minQuality: pref.alertMinQuality ?? null,
    minBudget: pref.alertMinBudget ?? null,
    maxBudget: pref.alertMaxBudget ?? null,
  };
}

/** Reads an auto-buy rule off an AgentPreference row. */
export function autoBuyCriteria(pref: {
  autoBuyCategories: string | null; autoBuyDestinations: string | null;
  autoBuyClientLocations: string | null;
  autoBuyMinQuality?: string | null; autoBuyMinBudget?: number | null; autoBuyMaxBudget?: number | null;
}): MatchCriteria {
  return {
    categories: parseJson<string[]>(pref.autoBuyCategories, []),
    destinations: parseJson<string[]>(pref.autoBuyDestinations, []),
    clientLocations: parseJson<string[]>(pref.autoBuyClientLocations, []),
    minQuality: pref.autoBuyMinQuality ?? null,
    minBudget: pref.autoBuyMinBudget ?? null,
    maxBudget: pref.autoBuyMaxBudget ?? null,
  };
}
