import "server-only";
import { getRedis } from "../cache/redis";

/**
 * Per-account login failure tracking with progressive backoff and a hard
 * lockout once the threshold is exceeded.
 *
 * Semantics
 * - Every failed login increments a per-email counter in Redis.
 * - The counter naturally decays after `ATTEMPT_WINDOW_SECONDS` of no
 *   further failures (TTL rolls forward on each failure until the threshold).
 * - Once the counter reaches `LOCKOUT_THRESHOLD`, the counter's TTL is
 *   extended to `LOCKOUT_WINDOW_SECONDS` — during that window the account
 *   is fully locked out regardless of correct credentials.
 * - A successful login (verified by the caller) clears the counter.
 * - Fails open when Redis is unavailable: we don't want an infra outage
 *   to prevent legitimate sign-ins.
 *
 * We deliberately key on **email**, not IP: attackers rotate IPs, and the
 * value of protecting a specific account outweighs the cost of a well-known
 * user being briefly gated after their own typos. IP-level throttling is
 * layered on top by the general rate-limit module in `lib/rate-limit.ts`.
 */

const ATTEMPT_WINDOW_SECONDS = 60 * 60; // 1 hour to fully decay after last failure
const LOCKOUT_THRESHOLD = 8;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minute hard lockout

/**
 * Advisory progressive backoff shown to the user as a "wait N seconds" hint
 * in the 401 response. The endpoint does NOT actually sleep for this many
 * seconds server-side (that would just tie up serverless invocations); the
 * client renders the hint, or CI/scripts can honour it. This is defense in
 * depth — the real teeth are (a) the Redis-based rate limit and (b) the
 * hard lockout above.
 */
const PROGRESSIVE_DELAYS = [1, 2, 5, 10, 30, 60, 120, 300];

const KEY_PREFIX = "voyana:login:fail:";

export type LockoutState =
  | { locked: true; retryAfterSeconds: number; failedAttempts: number }
  | { locked: false; failedAttempts: number };

function keyFor(email: string): string {
  return KEY_PREFIX + email.toLowerCase();
}

/**
 * Read-only check called BEFORE authenticating. Returns { locked: true } if
 * the caller must be sent away without attempting Supabase — this prevents
 * lockouts being bypassed by rapid parallel requests all hitting Supabase
 * before the counter increments.
 */
export async function checkLoginLockout(email: string): Promise<LockoutState> {
  const redis = getRedis();
  if (!redis) return { locked: false, failedAttempts: 0 };
  try {
    const key = keyFor(email);
    const raw = await redis.get<string | number>(key);
    const failed = Number(raw ?? 0);
    if (failed >= LOCKOUT_THRESHOLD) {
      const ttl = Number(await redis.ttl(key));
      const wait = ttl > 0 ? ttl : LOCKOUT_WINDOW_SECONDS;
      return { locked: true, retryAfterSeconds: wait, failedAttempts: failed };
    }
    return { locked: false, failedAttempts: failed };
  } catch (e) {
    console.error("[lockout] fail-open due to Redis error:", e);
    return { locked: false, failedAttempts: 0 };
  }
}

/**
 * Called AFTER a failed Supabase sign-in. Returns the recommended progressive
 * delay in seconds so the caller can put it in the response body (never sleeps
 * server-side). Also extends the TTL to a full lockout window once the
 * threshold is hit.
 */
export async function recordLoginFailure(email: string): Promise<{ delaySeconds: number; failedAttempts: number }> {
  const redis = getRedis();
  if (!redis) return { delaySeconds: 0, failedAttempts: 0 };
  try {
    const key = keyFor(email);
    const count = Number(await redis.incr(key));
    // Roll the TTL forward so the counter always reflects the recent window.
    if (count >= LOCKOUT_THRESHOLD) {
      await redis.expire(key, LOCKOUT_WINDOW_SECONDS);
    } else {
      await redis.expire(key, ATTEMPT_WINDOW_SECONDS);
    }
    const delay = PROGRESSIVE_DELAYS[Math.min(count - 1, PROGRESSIVE_DELAYS.length - 1)] ?? 0;
    return { delaySeconds: delay, failedAttempts: count };
  } catch (e) {
    console.error("[lockout] recordLoginFailure fail-open:", e);
    return { delaySeconds: 0, failedAttempts: 0 };
  }
}

export async function clearLoginFailures(email: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(keyFor(email));
  } catch {
    // Intentionally quiet — best effort. Old attempts will decay via TTL.
  }
}

// Exposed for tests + telemetry.
export const _internals = {
  ATTEMPT_WINDOW_SECONDS,
  LOCKOUT_THRESHOLD,
  LOCKOUT_WINDOW_SECONDS,
  PROGRESSIVE_DELAYS,
  keyFor,
};
