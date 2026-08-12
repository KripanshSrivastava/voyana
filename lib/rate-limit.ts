import "server-only";
import { getRedis } from "./cache/redis";

/**
 * Fixed-window rate limit against Upstash Redis (INCR + EXPIRE).
 *
 * Design choices:
 * - Fixed-window not sliding-window: two REST hops per check vs. Lua/sorted-set;
 *   the accuracy loss at the boundary is acceptable for anti-abuse; the DB
 *   layer still enforces business invariants regardless.
 * - **Fails open** when Redis is unconfigured or unreachable. Matches how
 *   publicCache.ts already degrades. We prefer serving legitimate traffic
 *   during infra outages over hard-failing every login attempt.
 * - Key composition is the caller's job — this module doesn't hash or canonicalise
 *   emails so identical strings from different call sites don't collide.
 *
 * Keys are prefixed `voyana:rl:` inside this module.
 */

const KEY_PREFIX = "voyana:rl:";

export type RateLimitOptions = {
  /** Rolling window length in seconds. */
  windowSeconds: number;
  /** Requests allowed within the window before the caller is 429'd. */
  max: number;
  /** Pre-composed identity string — e.g. `login:${email}:${ip}`. */
  key: string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Wall-clock ms epoch at which the current window resets. */
  resetAt: number;
  /** Seconds until retry — 0 when allowed, otherwise the value for the Retry-After header. */
  retryAfterSeconds: number;
};

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const redis = getRedis();
  const fallback: RateLimitResult = {
    allowed: true,
    remaining: opts.max - 1,
    resetAt: now + opts.windowSeconds * 1000,
    retryAfterSeconds: 0,
  };
  if (!redis) return fallback;

  const key = KEY_PREFIX + opts.key;
  try {
    const count = Number(await redis.incr(key));
    if (count === 1) {
      // First hit in this window — set the TTL that will eventually expire the counter.
      await redis.expire(key, opts.windowSeconds);
    }
    if (count > opts.max) {
      const ttl = Number(await redis.ttl(key));
      const wait = ttl > 0 ? ttl : opts.windowSeconds;
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + wait * 1000,
        retryAfterSeconds: wait,
      };
    }
    return {
      allowed: true,
      remaining: Math.max(0, opts.max - count),
      resetAt: now + opts.windowSeconds * 1000,
      retryAfterSeconds: 0,
    };
  } catch (e) {
    console.error("[rate-limit] fail-open due to Redis error:", e);
    return fallback;
  }
}

/**
 * Best-effort IP extraction from headers set by Vercel / typical reverse proxies.
 * Returns "unknown" as a stable fallback so caller composition never depends on
 * missing headers — the rate-limit key still exists, it just lumps all
 * unidentified callers into one bucket.
 */
export function ipFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Standard 429 JSON response with a Retry-After header (seconds).
 * Uses `Response` directly rather than NextResponse so this can be composed
 * inside `handler()` return positions without an extra import at every callsite.
 */
export function rateLimitResponse(result: RateLimitResult, message = "Too many requests. Please try again shortly."): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(1, result.retryAfterSeconds)),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    },
  });
}
