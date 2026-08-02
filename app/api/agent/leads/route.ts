import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { searchAvailableLeads } from "@/lib/agent/leads";

function toNum(value: string | null, fallback?: number | null) {
  if (value == null || value === "") return fallback ?? null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback ?? null;
}

export const GET = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);

  const url = new URL(req.url);
  const result = await searchAvailableLeads(session.agentId, {
    destination: url.searchParams.get("destination"),
    clientLocation: url.searchParams.get("clientLocation"),
    category: url.searchParams.get("category"),
    tripType: url.searchParams.get("tripType"),
    quality: url.searchParams.get("quality"),
    minBudget: toNum(url.searchParams.get("minBudget")),
    maxBudget: toNum(url.searchParams.get("maxBudget")),
    minTravelers: toNum(url.searchParams.get("minTravelers")),
    maxTravelers: toNum(url.searchParams.get("maxTravelers")),
    travelDateFrom: url.searchParams.get("travelDateFrom"),
    travelDateTo: url.searchParams.get("travelDateTo"),
    search: url.searchParams.get("search"),
    sort: url.searchParams.get("sort"),
    page: toNum(url.searchParams.get("page"), 1) ?? 1,
    limit: toNum(url.searchParams.get("limit"), 20) ?? 20,
  });

  return ok(result);
});