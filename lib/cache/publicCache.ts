import "server-only";
import { getRedis } from "./redis";

const PREFIX = "voyana:public:";

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
  if (!redis) return fetcher();

  try {
    const hit = await redis.get<T>(PREFIX + key);
    if (hit !== null && hit !== undefined) return hit;
  } catch (e) {
    console.error("[cache] read failed, falling back to DB:", e);
  }

  const fresh = await fetcher();
  try {
    await redis.set(PREFIX + key, fresh, { ex: ttlSeconds });
  } catch (e) {
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
    console.error("[cache] invalidate failed (non-fatal):", e);
  }
}
