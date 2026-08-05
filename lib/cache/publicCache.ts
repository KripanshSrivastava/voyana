import "server-only";
import { getRedis } from "./redis";
import { withReadRetry } from "../db";

const PREFIX = "voyana:public:";

/**
 * Next.js signals control flow by THROWING tagged errors — a `no-store` fetch
 * (which is what the Upstash REST client issues) during the build's static
 * prerender pass throws DYNAMIC_SERVER_USAGE to mean "this route can't be
 * static, re-render it dynamically". Same for redirect()/notFound().
 * These are not failures: swallowing them logs alarming build noise AND can
 * stop Next from bailing out correctly, so they must be rethrown untouched.
 */
function isFrameworkControlFlow(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (
    digest === "DYNAMIC_SERVER_USAGE" ||
    digest === "NEXT_REDIRECT" ||
    digest === "NEXT_NOT_FOUND" ||
    digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") ||
    digest.startsWith("BAILOUT_TO_CLIENT_SIDE_RENDERING")
  );
}

/**
 * Cache-aside read for read-only PUBLIC content only (destinations, packages,
 * site settings). NEVER use this for wallet balances, lead purchase state,
 * assignment counts, payment status, or anything authorization-related — a
 * stale read there could cause a double-purchase or security problem. Those
 * paths must keep reading Supabase Postgres directly, transactionally.
 *
 * Any Redis failure (unconfigured, network error, timeout) falls straight
 * through to `fetcher()` — the database is always the fallback of record, so
 * Redis being down never breaks the site.
 */
export async function cached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const redis = getRedis();
  if (!redis) return withReadRetry(fetcher);

  try {
    const hit = await redis.get<T>(PREFIX + key);
    if (hit !== null && hit !== undefined) return hit;
  } catch (e) {
    if (isFrameworkControlFlow(e)) throw e;
    console.error("[cache] read failed, falling back to DB:", e);
  }

  const fresh = await withReadRetry(fetcher);
  try {
    await redis.set(PREFIX + key, fresh, { ex: ttlSeconds });
  } catch (e) {
    if (isFrameworkControlFlow(e)) throw e;
    console.error("[cache] write failed (non-fatal):", e);
  }
  return fresh;
}

/** Best-effort key invalidation — call from admin mutation routes alongside revalidatePath. */
export async function invalidateCache(...keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys.map((k) => PREFIX + k));
  } catch (e) {
    if (isFrameworkControlFlow(e)) throw e;
    console.error("[cache] invalidate failed (non-fatal):", e);
  }
}
