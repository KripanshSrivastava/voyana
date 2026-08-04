import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Prisma's default interactive-transaction timeout (5000ms) is too tight
    // over this connection — purchaseLead()'s transaction does several
    // sequential round trips (agent/lead lookups, capacity + credit claims,
    // assignment/payment/ledger writes, status history) and was measured
    // hitting ~5.2s, causing a P2028 "transaction already closed" failure.
    // This does NOT change transaction behavior/business logic, only how
    // long Prisma waits before giving up.
    transactionOptions: { timeout: 20000, maxWait: 10000 },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const TRANSIENT_CONNECTION_PATTERNS = [
  "Can't reach database server",
  "Server has closed the connection",
  "Connection reset",
  "ECONNRESET",
  "P1001",
  "P1017",
];

function isTransientConnectionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return TRANSIENT_CONNECTION_PATTERNS.some((p) => message.includes(p));
}

/**
 * Retries a READ-ONLY query up to `attempts` times when it fails with a
 * transient connection error (the direct, unpooled Supabase connection this
 * app currently uses occasionally drops/resets — see lib/settings.ts and
 * lib/cache/publicCache.ts for where this matters). Never wrap writes/
 * transactions in this — retrying a mutation blindly could double-apply it.
 * A single unretried failure here is also what was producing inconsistent
 * SSR output between renders (one render error-boundaries, the next
 * succeeds), which surfaced as a hydration mismatch — this removes that.
 */
export async function withReadRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientConnectionError(err) || i === attempts) throw err;
      await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    }
  }
  throw lastErr;
}
