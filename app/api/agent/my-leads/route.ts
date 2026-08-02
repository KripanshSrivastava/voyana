import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { searchAgentPurchases } from "@/lib/agent/leads";

function toNum(value: string | null, fallback?: number | null) {
  if (value == null || value === "") return fallback ?? null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback ?? null;
}

export const GET = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);

  const url = new URL(req.url);
  const result = await searchAgentPurchases(session.agentId, {
    status: url.searchParams.get("status"),
    destination: url.searchParams.get("destination"),
    clientLocation: url.searchParams.get("clientLocation"),
    category: url.searchParams.get("category"),
    travelDateFrom: url.searchParams.get("travelDateFrom"),
    travelDateTo: url.searchParams.get("travelDateTo"),
    purchaseDateFrom: url.searchParams.get("purchaseDateFrom"),
    purchaseDateTo: url.searchParams.get("purchaseDateTo"),
    search: url.searchParams.get("search"),
    leadCode: url.searchParams.get("leadCode"),
    customerName: url.searchParams.get("customerName"),
    sort: url.searchParams.get("sort"),
    page: toNum(url.searchParams.get("page"), 1) ?? 1,
    limit: toNum(url.searchParams.get("limit"), 20) ?? 20,
  });

  return ok(result);
});