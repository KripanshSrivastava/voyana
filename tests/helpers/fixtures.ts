import { prisma } from "./db";

let counter = 0;
function uid(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/**
 * Baseline site settings the atomic purchase flow reads. Every test file
 * upserts this before running. Numbers pulled from schema.prisma defaults
 * so tests reflect production semantics (1 credit shared / 2 credits exclusive).
 */
export async function ensureBaselineSettings() {
  return prisma.siteSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      brandName: "Moksh Booking (Test)",
      defaultLeadPrice: 1,
      leadMaxAgents: 2,
      leadExpiryHours: 72,
      leadValidityDays: 365,
      priceSharedDomestic: 1,
      priceSharedInternational: 1,
      priceExclusiveDomestic: 2,
      priceExclusiveInternational: 2,
      adCostPerClickCredits: 10,
      vendorAdsEnabled: false,
      autoBuyEnabled: false, // keep auto-buy quiet during purchase tests
      supportEnabled: false,
      packageMarketplaceEnabled: false,
    },
    update: {
      leadMaxAgents: 2,
      priceSharedDomestic: 1,
      priceSharedInternational: 1,
      priceExclusiveDomestic: 2,
      priceExclusiveInternational: 2,
      autoBuyEnabled: false,
    },
  });
}

/**
 * Create an APPROVED + VERIFIED agent with a Lead Credit balance ready to buy.
 * Zero credits by default — override via `credits`.
 */
export async function makeAgent(opts: { credits?: number; status?: string; companyName?: string } = {}) {
  const email = `${uid("agent")}@test.local`;
  const user = await prisma.user.create({
    data: {
      email,
      name: `Test Agent ${counter}`,
      role: "AGENT",
      emailVerified: true,
    },
  });
  const agent = await prisma.agent.create({
    data: {
      userId: user.id,
      companyName: opts.companyName ?? `Test Co ${counter}`,
      phone: "9000000000",
      status: opts.status ?? "APPROVED",
      verificationStatus: "VERIFIED",
    },
  });
  if ((opts.credits ?? 0) > 0) {
    await prisma.agentCreditBalance.create({
      data: { agentId: agent.id, balance: opts.credits! },
    });
  } else {
    await prisma.agentCreditBalance.create({
      data: { agentId: agent.id, balance: 0 },
    });
  }
  return { user, agent };
}

/**
 * Create a purchasable Lead. Default: domestic, 2-agent cap, priced at 1 credit,
 * not expired, status QUALIFIED.
 */
export async function makeLead(opts: {
  price?: number | null;
  maxAgents?: number;
  tripCategory?: "DOMESTIC" | "INTERNATIONAL" | "INBOUND" | null;
  assignmentCount?: number;
  status?: string;
  expiresAt?: Date | null;
} = {}) {
  const code = `LD-TEST-${counter++}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return prisma.lead.create({
    data: {
      code,
      customerName: "Test Customer",
      phone: `9${Math.floor(Math.random() * 1e9).toString().padStart(9, "0")}`,
      destinationText: "Goa",
      tripCategory: opts.tripCategory ?? "DOMESTIC",
      status: opts.status ?? "QUALIFIED",
      quality: "GOOD",
      qualityScore: 70,
      price: opts.price ?? 1,
      assignmentCount: opts.assignmentCount ?? 0,
      maxAgents: opts.maxAgents ?? 2,
      expiresAt: opts.expiresAt === null ? null : (opts.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      source: "website",
      sourceType: "website",
    },
  });
}
