import { parseJson } from "../utils";

// Note: lead quality/budget/price are deliberately NOT part of matching —
// alerts and auto-buy only match on destination/category/client location.
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
  return true;
}

/** Reads an alert rule off an AgentPreference row. */
export function alertCriteria(pref: {
  alertCategories: string | null; alertDestinations: string | null;
}): MatchCriteria {
  return {
    categories: parseJson<string[]>(pref.alertCategories, []),
    destinations: parseJson<string[]>(pref.alertDestinations, []),
  };
}

/** Reads an auto-buy rule off an AgentPreference row. */
export function autoBuyCriteria(pref: {
  autoBuyCategories: string | null; autoBuyDestinations: string | null;
  autoBuyClientLocations: string | null;
}): MatchCriteria {
  return {
    categories: parseJson<string[]>(pref.autoBuyCategories, []),
    destinations: parseJson<string[]>(pref.autoBuyDestinations, []),
    clientLocations: parseJson<string[]>(pref.autoBuyClientLocations, []),
  };
}
