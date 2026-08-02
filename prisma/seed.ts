/**
 * Development-only seed. Run with: npm run seed:test
 * Creates a test admin, agents, wallet credit, a destination, packages/tour and
 * a few leads so the full flow can be demonstrated. Idempotent (safe to re-run).
 * The production-like app stays empty unless this is run.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/** Create (or find, if it already exists) the Supabase auth user; returns its UUID. */
async function ensureAuthUser(email: string, password: string, name: string): Promise<string> {
  const { data, error } = await sbAdmin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name },
  });
  if (data?.user) return data.user.id;
  if (error && /already|registered|exists/i.test(error.message)) {
    const { data: list } = await sbAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
  }
  throw error ?? new Error(`Could not ensure auth user ${email}`);
}

async function main() {
  const pw = (s: string) => bcrypt.hashSync(s, 10);

  // --- Admin ---
  const adminAuthId = await ensureAuthUser("admin@voyana.test", "admin123", "Voyana Admin");
  await prisma.user.upsert({
    where: { email: "admin@voyana.test" },
    update: { authId: adminAuthId },
    create: { email: "admin@voyana.test", name: "Voyana Admin", role: "ADMIN", authId: adminAuthId, passwordHash: pw("admin123") },
  });

  // --- Approved agent with ₹5,000 wallet ---
  const agentAuthId = await ensureAuthUser("agent@voyana.test", "agent123", "Ravi Kumar");
  const agentUser = await prisma.user.upsert({
    where: { email: "agent@voyana.test" },
    update: { authId: agentAuthId },
    create: {
      email: "agent@voyana.test",
      name: "Ravi Kumar",
      role: "AGENT",
      authId: agentAuthId,
      passwordHash: pw("agent123"),
      agent: {
        create: {
          companyName: "Himalayan Trails Travel",
          phone: "+91 98100 11111",
          city: "Delhi",
          status: "APPROVED",
          wallet: { create: { balance: 5000 } },
        },
      },
    },
    include: { agent: { include: { wallet: true } } },
  });
  // Ensure wallet has at least 5000 on re-run
  if (agentUser.agent?.wallet && agentUser.agent.wallet.balance < 5000) {
    await prisma.agentWallet.update({ where: { agentId: agentUser.agent.id }, data: { balance: 5000 } });
  }

  // --- Second agent (approved) so 2-agent cap can be demoed ---
  const agent2AuthId = await ensureAuthUser("agent2@voyana.test", "agent123", "Meera Nair");
  await prisma.user.upsert({
    where: { email: "agent2@voyana.test" },
    update: { authId: agent2AuthId },
    create: {
      email: "agent2@voyana.test",
      name: "Meera Nair",
      role: "AGENT",
      authId: agent2AuthId,
      passwordHash: pw("agent123"),
      agent: {
        create: {
          companyName: "Coastal Escapes",
          phone: "+91 98200 22222",
          city: "Mumbai",
          status: "APPROVED",
          wallet: { create: { balance: 5000 } },
        },
      },
    },
  });

  // --- Pending agent (for approval demo) ---
  const agent3AuthId = await ensureAuthUser("agent3@voyana.test", "agent123", "Arjun Shah");
  await prisma.user.upsert({
    where: { email: "agent3@voyana.test" },
    update: { authId: agent3AuthId },
    create: {
      email: "agent3@voyana.test",
      name: "Arjun Shah",
      role: "AGENT",
      authId: agent3AuthId,
      passwordHash: pw("agent123"),
      agent: {
        create: { companyName: "Peak Journeys", phone: "+91 98300 33333", city: "Pune", status: "PENDING", wallet: { create: { balance: 0 } } },
      },
    },
  });

  // --- Destination ---
  const kashmir = await prisma.destination.upsert({
    where: { slug: "kashmir" },
    update: {},
    create: {
      name: "Kashmir",
      slug: "kashmir",
      shortDescription: "Snow-capped peaks, houseboats on Dal Lake, and valleys of wildflowers.",
      longDescription:
        "Kashmir is a land of breathtaking landscapes — from the serene Dal Lake and its iconic houseboats to the meadows of Gulmarg and Pahalgam. Ideal for honeymoons, family holidays and adventure seekers alike.",
      bestTime: "March – October",
      startingPrice: 24999,
      tripTypes: JSON.stringify(["Honeymoon", "Family", "Adventure"]),
      highlights: JSON.stringify(["Shikara ride on Dal Lake", "Gondola cable car at Gulmarg", "Betaab Valley in Pahalgam", "Mughal Gardens"]),
      faqs: JSON.stringify([{ question: "Is Kashmir safe to travel?", answer: "Yes — popular tourist areas are well-visited and safe. Our experts share current, on-ground advice." }]),
      published: true,
      featured: true,
      sortOrder: 1,
      seoTitle: "Kashmir Holiday Packages",
      seoDescription: "Explore Kashmir tour and holiday packages. Get free personalized quotes from travel experts.",
    },
  });

  // --- Package ---
  const existingPkg = await prisma.tourPackage.findUnique({ where: { slug: "kashmir-family-escape" } });
  if (!existingPkg) {
    await prisma.tourPackage.create({
      data: {
        kind: "PACKAGE",
        title: "Kashmir Family Escape",
        slug: "kashmir-family-escape",
        destinationId: kashmir.id,
        shortDescription: "6 days across Srinagar, Gulmarg and Pahalgam with houseboat stay.",
        longDescription: "A relaxed family-friendly itinerary covering the best of the Kashmir valley, with comfortable hotels and a memorable houseboat night on Dal Lake.",
        durationDays: 6,
        durationNights: 5,
        durationText: "6D / 5N",
        startingPrice: 29999,
        offerPrice: 24999,
        priceLabel: "Starting from",
        currency: "INR",
        hotelCategory: "4-star + Deluxe Houseboat",
        accommodation: "Handpicked 4-star hotels and a deluxe houseboat on Dal Lake.",
        transport: "Private AC vehicle for all transfers and sightseeing.",
        activities: JSON.stringify(["Shikara ride", "Gulmarg gondola", "Betaab Valley visit"]),
        tripType: "Family",
        published: true,
        featured: true,
        sortOrder: 1,
        images: { create: [] },
        itinerary: {
          create: [
            { day: 1, title: "Arrival in Srinagar", description: "Airport pickup, houseboat check-in, evening Shikara ride.", sortOrder: 0 },
            { day: 2, title: "Srinagar → Gulmarg", description: "Gondola ride and snow activities at Gulmarg.", sortOrder: 1 },
            { day: 3, title: "Gulmarg → Pahalgam", description: "Scenic drive and Betaab Valley visit.", sortOrder: 2 },
            { day: 4, title: "Pahalgam sightseeing", description: "Aru and Chandanwari valleys.", sortOrder: 3 },
            { day: 5, title: "Back to Srinagar", description: "Mughal Gardens and local shopping.", sortOrder: 4 },
            { day: 6, title: "Departure", description: "Airport drop with memories to keep.", sortOrder: 5 },
          ],
        },
        inclusions: { create: [
          { text: "5 nights accommodation with breakfast", sortOrder: 0 },
          { text: "Private AC transport", sortOrder: 1 },
          { text: "1 night deluxe houseboat", sortOrder: 2 },
          { text: "All sightseeing as per itinerary", sortOrder: 3 },
        ] },
        exclusions: { create: [
          { text: "Airfare", sortOrder: 0 },
          { text: "Gondola tickets at Gulmarg", sortOrder: 1 },
          { text: "Personal expenses", sortOrder: 2 },
        ] },
        faqs: { create: [
          { question: "Are flights included?", answer: "Flights are not included, but our experts can arrange them on request.", sortOrder: 0 },
        ] },
      },
    });
  }

  // --- Tour ---
  if (!(await prisma.tourPackage.findUnique({ where: { slug: "gulmarg-day-tour" } }))) {
    await prisma.tourPackage.create({
      data: {
        kind: "TOUR",
        title: "Gulmarg Gondola Day Tour",
        slug: "gulmarg-day-tour",
        destinationId: kashmir.id,
        shortDescription: "A full-day guided tour to Gulmarg with gondola ride.",
        durationDays: 1,
        durationText: "Full day",
        startingPrice: 3499,
        tripType: "Adventure",
        published: true,
        featured: true,
        sortOrder: 1,
        activities: JSON.stringify(["Gondola Phase 1 & 2", "Snow play", "Guided sightseeing"]),
      },
    });
  }

  // --- Leads (priced + available) ---
  const seedLeads = [
    { code: "LD-2026-900001", name: "Anita Verma", phone: "+91 90000 10001", dest: "Kashmir", budget: 60000, price: 750, source: "google", campaign: "kashmir-search", quality: "EXCELLENT", travelers: 4, tripType: "Family" },
    { code: "LD-2026-900002", name: "Sameer Khan", phone: "+91 90000 10002", dest: "Goa", budget: 40000, price: 500, source: "meta", campaign: "goa-summer", quality: "GOOD", travelers: 2, tripType: "Honeymoon" },
    { code: "LD-2026-900003", name: "Priya Menon", phone: "+91 90000 10003", dest: "Kashmir", budget: 90000, price: 1000, source: "direct", campaign: "", quality: "GOOD", travelers: 3, tripType: "Family" },
  ];
  for (const l of seedLeads) {
    if (await prisma.lead.findUnique({ where: { code: l.code } })) continue;
    await prisma.lead.create({
      data: {
        code: l.code,
        customerName: l.name,
        phone: l.phone,
        email: `${l.name.split(" ")[0].toLowerCase()}@example.com`,
        destinationText: l.dest,
        departureCity: "Delhi",
        travelDate: new Date(Date.now() + 30 * 864e5),
        travelers: l.travelers,
        budget: l.budget,
        tripType: l.tripType,
        requirements: JSON.stringify(["Hotel", "Transport", "Sightseeing"]),
        status: "AVAILABLE",
        quality: l.quality,
        qualityScore: 82,
        price: l.price,
        maxAgents: 2,
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
        utmSource: l.source,
        utmCampaign: l.campaign || null,
        destinationId: l.dest === "Kashmir" ? kashmir.id : null,
        statusHistory: { create: [
          { toStatus: "NEW", actorType: "SYSTEM", note: "Lead submitted from website" },
          { toStatus: "AVAILABLE", actorType: "ADMIN", actorLabel: "Voyana Admin", note: "Qualified and priced" },
        ] },
      },
    });
  }

  console.log("✅ Seed complete.\n   Admin:  admin@voyana.test / admin123\n   Agent:  agent@voyana.test / agent123 (₹5,000 wallet)\n   Agent2: agent2@voyana.test / agent123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
