import { prisma } from "../db";
import type { Prisma } from "@prisma/client";

// Statuses that mean "an agent can still buy this lead."
// IN_PROGRESS is deliberately excluded: purchaseLead() sets that status the
// moment a lead becomes fully distributed (last shared slot taken, OR any
// exclusive purchase — which jumps assignmentCount straight to maxAgents).
// Including it here would show unbuyable leads in the marketplace and inflate
// the paginated total. See lib/leads/purchase.ts for the status transition.
const AVAILABLE_STATUSES = ["QUALIFIED", "AVAILABLE", "SHARED"];

type AvailableLeadItem = Prisma.LeadGetPayload<{
  include: {
    _count: { select: { assignments: true } };
    destination: { select: { name: true } };
    assignments: { select: { id: true } };
  };
}>;

type AgentPurchaseItem = Prisma.LeadAssignmentGetPayload<{
  include: { lead: { include: { destination: { select: { name: true } } } } };
}>;

export type LeadListPage<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AvailableLeadFilters = {
  destination?: string | null;
  clientLocation?: string | null;
  category?: string | null;
  tripType?: string | null;
  minTravelers?: number | null;
  maxTravelers?: number | null;
  travelDateFrom?: string | null;
  travelDateTo?: string | null;
  search?: string | null;
  sort?: string | null;
  page?: number;
  limit?: number;
};

export type MyLeadFilters = {
  status?: string | null;
  destination?: string | null;
  clientLocation?: string | null;
  category?: string | null;
  travelDateFrom?: string | null;
  travelDateTo?: string | null;
  purchaseDateFrom?: string | null;
  purchaseDateTo?: string | null;
  search?: string | null;
  leadCode?: string | null;
  customerName?: string | null;
  sort?: string | null;
  page?: number;
  limit?: number;
};

function cleanText(value?: string | null): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function containsInsensitive(field: string): Prisma.StringFilter {
  return { contains: field, mode: "insensitive" };
}

function buildAvailableWhere(agentId: string, filters: AvailableLeadFilters): Prisma.LeadWhereInput {
  // NB: we intentionally do NOT filter out leads the agent already owns —
  // they are surfaced too, so a working vendor never sees an empty marketplace
  // grid. The `agentId` param is kept in the signature because upstream
  // callers still supply it and future filters may need it.
  void agentId;
  const and: Prisma.LeadWhereInput[] = [
    {
      price: { gt: 0 },
      status: { in: AVAILABLE_STATUSES },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  ];

  const destination = cleanText(filters.destination);
  if (destination) {
    and.push({ OR: [{ destinationText: containsInsensitive(destination) }, { destination: { name: containsInsensitive(destination) } }] });
  }

  const clientLocation = cleanText(filters.clientLocation);
  if (clientLocation) and.push({ clientLocation: containsInsensitive(clientLocation) });

  if (cleanText(filters.category)) and.push({ tripCategory: cleanText(filters.category) ?? undefined });
  if (cleanText(filters.tripType)) and.push({ tripType: containsInsensitive(cleanText(filters.tripType)!) });
  if (filters.minTravelers != null) and.push({ travelers: { gte: filters.minTravelers } });
  if (filters.maxTravelers != null) and.push({ travelers: { lte: filters.maxTravelers } });
  if (filters.travelDateFrom || filters.travelDateTo) {
    and.push({
      travelDate: {
        gte: filters.travelDateFrom ? new Date(filters.travelDateFrom) : undefined,
        lte: filters.travelDateTo ? new Date(filters.travelDateTo) : undefined,
      },
    });
  }

  const search = cleanText(filters.search);
  if (search) {
    and.push({
      OR: [
        { code: containsInsensitive(search) },
        { destinationText: containsInsensitive(search) },
        { customerName: containsInsensitive(search) },
        { departureCity: containsInsensitive(search) },
        { clientLocation: containsInsensitive(search) },
        { tripType: containsInsensitive(search) },
      ],
    });
  }

  return { AND: and };
}

function buildAvailableOrder(sort?: string | null): Prisma.LeadOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }];
    case "price_asc":
      return [{ price: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [{ price: "desc" }, { createdAt: "desc" }];
    case "travel_asc":
      return [{ travelDate: "asc" }, { createdAt: "desc" }];
    case "travel_desc":
      return [{ travelDate: "desc" }, { createdAt: "desc" }];
    case "quality_desc":
      return [{ qualityScore: "desc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

function buildAssignmentWhere(agentId: string, filters: MyLeadFilters): Prisma.LeadAssignmentWhereInput {
  const and: Prisma.LeadAssignmentWhereInput[] = [{ agentId }];

  const status = cleanText(filters.status);
  if (status) and.push({ status });

  const destination = cleanText(filters.destination);
  if (destination) and.push({ lead: { OR: [{ destinationText: containsInsensitive(destination) }, { destination: { name: containsInsensitive(destination) } }] } });

  const clientLocation = cleanText(filters.clientLocation);
  if (clientLocation) and.push({ lead: { clientLocation: containsInsensitive(clientLocation) } });

  const category = cleanText(filters.category);
  if (category) and.push({ lead: { tripCategory: category } });

  if (filters.travelDateFrom || filters.travelDateTo) {
    and.push({
      lead: {
        travelDate: {
          gte: filters.travelDateFrom ? new Date(filters.travelDateFrom) : undefined,
          lte: filters.travelDateTo ? new Date(filters.travelDateTo) : undefined,
        },
      },
    });
  }

  if (filters.purchaseDateFrom || filters.purchaseDateTo) {
    and.push({
      purchasedAt: {
        gte: filters.purchaseDateFrom ? new Date(filters.purchaseDateFrom) : undefined,
        lte: filters.purchaseDateTo ? new Date(filters.purchaseDateTo) : undefined,
      },
    });
  }

  const search = cleanText(filters.search);
  const leadCode = cleanText(filters.leadCode);
  const customerName = cleanText(filters.customerName);
  const or: Prisma.LeadAssignmentWhereInput[] = [];
  if (search) {
    or.push({ lead: { OR: [{ code: containsInsensitive(search) }, { customerName: containsInsensitive(search) }, { destinationText: containsInsensitive(search) }, { phone: containsInsensitive(search) }] } });
  }
  if (leadCode) or.push({ lead: { code: containsInsensitive(leadCode) } });
  if (customerName) or.push({ lead: { customerName: containsInsensitive(customerName) } });
  if (or.length > 0) and.push({ OR: or });

  return { AND: and };
}

function buildAssignmentOrder(sort?: string | null): Prisma.LeadAssignmentOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ purchasedAt: "asc" }];
    case "status":
      return [{ status: "asc" }, { purchasedAt: "desc" }];
    case "destination":
      return [{ lead: { destinationText: "asc" } }, { purchasedAt: "desc" }];
    case "travel_asc":
      return [{ lead: { travelDate: "asc" } }, { purchasedAt: "desc" }];
    case "travel_desc":
      return [{ lead: { travelDate: "desc" } }, { purchasedAt: "desc" }];
    default:
      return [{ purchasedAt: "desc" }];
  }
}

/** Cheap count for dashboard stat cards. Counts leads with remaining capacity
 *  the agent doesn't already own — the stat is meant to nudge "there's X new
 *  ones you can still buy", so it excludes already-purchased leads (those
 *  still render in the grid so it never looks empty, but they don't count as
 *  "new" opportunities). */
export async function countAvailableLeads(agentId: string): Promise<number> {
  const rows = await prisma.lead.findMany({
    where: {
      price: { gt: 0 },
      status: { in: AVAILABLE_STATUSES },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      assignments: { none: { agentId } },
    },
    select: { assignmentCount: true, maxAgents: true },
  });
  return rows.filter((l) => l.assignmentCount < l.maxAgents).length;
}

/** Leads an approved agent may buy: priced, not expired, capacity free, not already theirs. */
export async function getAvailableLeads(agentId: string) {
  const leads = await prisma.lead.findMany({
    where: {
      price: { gt: 0 },
      status: { in: AVAILABLE_STATUSES },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      assignments: { none: { agentId } },
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { assignments: true } }, destination: { select: { name: true } } },
  });
  // Enforce capacity at read time too (belt and suspenders).
  return leads.filter((l) => l._count.assignments < l.maxAgents);
}

export async function searchAvailableLeads(agentId: string, filters: AvailableLeadFilters): Promise<LeadListPage<AvailableLeadItem>> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit ?? 20)));
  const where = buildAvailableWhere(agentId, filters);
  const [total, items] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: buildAvailableOrder(filters.sort),
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { assignments: true } },
        destination: { select: { name: true } },
        // Only fetch THIS agent's assignment row (never other agents') so the
        // card can render "Already yours" without leaking who else bought it.
        assignments: { where: { agentId }, select: { id: true }, take: 1 },
      },
    }),
  ]);
  // Fully-sold leads are hidden UNLESS this agent already owns one of the
  // slots — in which case they must still be visible so the agent can open
  // and work the lead. This is what keeps the grid from ever going blank.
  const filtered = items.filter((l) => l._count.assignments < l.maxAgents || l.assignments.length > 0);
  return { items: filtered, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getAgentLead(agentId: string, leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      _count: { select: { assignments: true } },
      destination: { select: { name: true } },
      assignments: { where: { agentId } },
      notes: { where: { authorType: "ADMIN" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!lead) return null;
  const assignment = lead.assignments[0] ?? null;
  return { lead, assignment, owned: Boolean(assignment) };
}

export async function getAgentPurchases(agentId: string) {
  return prisma.leadAssignment.findMany({
    where: { agentId },
    orderBy: { purchasedAt: "desc" },
    include: { lead: { include: { destination: { select: { name: true } } } } },
  });
}

export async function searchAgentPurchases(agentId: string, filters: MyLeadFilters): Promise<LeadListPage<AgentPurchaseItem>> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit ?? 20)));
  const where = buildAssignmentWhere(agentId, filters);
  const [total, items] = await Promise.all([
    prisma.leadAssignment.count({ where }),
    prisma.leadAssignment.findMany({
      where,
      orderBy: buildAssignmentOrder(filters.sort),
      skip: (page - 1) * limit,
      take: limit,
      include: { lead: { include: { destination: { select: { name: true } } } } },
    }),
  ]);
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
