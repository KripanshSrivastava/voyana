/**
 * One-time production reset before public launch.
 *
 * Wipes: Users (cascades Agent + everything owned by it), Leads (cascades
 * assignments/history/notes/payments/spam reports), Destinations & Tour
 * Packages (cascades their images/itinerary/inclusions/exclusions/FAQs),
 * Campaigns, IntegrationLogs, AuditLogs, and every Supabase Auth login.
 *
 * Kept: `Media` rows + the actual uploaded files in storage (nothing
 * references them by FK, so they're never touched), `SiteSetting`,
 * `MessageTemplate`, and `LeadCreditPackage` (pricing catalog the site
 * needs on day one).
 *
 * Then creates exactly one fresh admin account.
 *
 * NOT idempotent, NOT reversible without a DB backup/PITR. Guarded behind
 * two explicit confirmations so it can't run by accident:
 *
 *   CONFIRM=WIPE_PRODUCTION NEW_ADMIN_EMAIL=you@x.com NEW_ADMIN_PASSWORD='...' \
 *     npx dotenv -e .env.production -- tsx prisma/reset-for-launch.ts
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.CONFIRM !== "WIPE_PRODUCTION") {
    throw new Error(
      "Refusing to run. Set CONFIRM=WIPE_PRODUCTION to acknowledge this permanently deletes production data.",
    );
  }
  const adminEmail = process.env.NEW_ADMIN_EMAIL;
  const adminPassword = process.env.NEW_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("Set NEW_ADMIN_EMAIL and NEW_ADMIN_PASSWORD.");
  }
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl || dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
    throw new Error(`DATABASE_URL doesn't look like production: ${dbUrl.slice(0, 40)}...`);
  }

  const sbAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  console.log(`Target DB: ${dbUrl.replace(/:[^:@]+@/, ":****@")}`);

  // --- 1. Remove every Supabase Auth login (admin/agent/customer) ---
  console.log("Removing all Supabase Auth users...");
  let page = 1;
  let removedAuth = 0;
  for (;;) {
    const { data, error } = await sbAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    if (data.users.length === 0) break;
    for (const u of data.users) {
      const { error: delErr } = await sbAdmin.auth.admin.deleteUser(u.id);
      if (delErr) throw delErr;
      removedAuth++;
    }
    page++;
  }
  console.log(`Removed ${removedAuth} Supabase Auth user(s).`);

  // --- 2. Wipe app data (FK cascades handle child rows) ---
  console.log("Wiping leads, CMS content, users/agents, campaigns and logs...");
  const [leads, packages, destinations, users, campaigns, integrationLogs, auditLogs] =
    await prisma.$transaction([
      prisma.lead.deleteMany(),
      prisma.tourPackage.deleteMany(),
      prisma.destination.deleteMany(),
      prisma.user.deleteMany(),
      prisma.campaign.deleteMany(),
      prisma.integrationLog.deleteMany(),
      prisma.auditLog.deleteMany(),
    ]);
  console.log({
    leadsDeleted: leads.count,
    tourPackagesDeleted: packages.count,
    destinationsDeleted: destinations.count,
    usersDeleted: users.count, // cascades Agent + wallets/credits/tickets/ads/notifications
    campaignsDeleted: campaigns.count,
    integrationLogsDeleted: integrationLogs.count,
    auditLogsDeleted: auditLogs.count,
  });

  const mediaCount = await prisma.media.count();
  console.log(`Media rows left untouched: ${mediaCount}`);

  // --- 3. Create the one admin account ---
  console.log(`Creating admin ${adminEmail}...`);
  const { data: created, error: createErr } = await sbAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { name: "Admin" },
  });
  if (createErr || !created?.user) throw createErr ?? new Error("Failed to create Supabase Auth admin");

  await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Admin",
      role: "ADMIN",
      authId: created.user.id,
      passwordHash: bcrypt.hashSync(adminPassword, 10),
      emailVerified: true,
    },
  });

  console.log("Done. Fresh admin created; sign in at /login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
