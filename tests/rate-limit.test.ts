import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Unit tests for lib/rate-limit — the Redis client is mocked so these tests
 * don't need a test DB or real Upstash. They cover the fixed-window logic,
 * fail-open behavior, and Retry-After response shape.
 */

const store = new Map<string, { count: number; ttl: number; setAt: number }>();

// Reset the in-memory store between tests.
beforeEach(() => store.clear());

/**
 * getRedis() returns null → fail-open path. Individual tests re-mock it to
 * return the fake implementation below where needed.
 */
function mockRedisWithStore() {
  vi.doMock("../lib/cache/redis", () => ({
    getRedis: () => ({
      async incr(key: string) {
        const now = Date.now();
        const entry = store.get(key);
        if (!entry || (entry.ttl > 0 && now - entry.setAt > entry.ttl * 1000)) {
          store.set(key, { count: 1, ttl: 0, setAt: now });
          return 1;
        }
        entry.count += 1;
        return entry.count;
      },
      async expire(key: string, ttl: number) {
        const entry = store.get(key);
        if (entry) {
          entry.ttl = ttl;
          entry.setAt = Date.now();
        }
        return 1;
      },
      async ttl(key: string) {
        const entry = store.get(key);
        if (!entry) return -2;
        if (entry.ttl <= 0) return -1;
        const elapsed = Math.floor((Date.now() - entry.setAt) / 1000);
        return Math.max(0, entry.ttl - elapsed);
      },
      async get() {
        return null;
      },
      async del(...keys: string[]) {
        for (const k of keys) store.delete(k);
        return keys.length;
      },
    }),
  }));
}

function mockRedisUnavailable() {
  vi.doMock("../lib/cache/redis", () => ({ getRedis: () => null }));
}

function mockRedisThrows() {
  vi.doMock("../lib/cache/redis", () => ({
    getRedis: () => ({
      incr: async () => {
        throw new Error("upstash unreachable");
      },
      expire: async () => 0,
      ttl: async () => -1,
      get: async () => null,
      del: async () => 0,
    }),
  }));
}

describe("rateLimit — fixed window", () => {
  it("allows the first N requests and denies the (N+1)th", async () => {
    vi.resetModules();
    mockRedisWithStore();
    const { rateLimit } = await import("../lib/rate-limit");

    const opts = { key: "unit:allowN", windowSeconds: 60, max: 3 };
    const r1 = await rateLimit(opts);
    const r2 = await rateLimit(opts);
    const r3 = await rateLimit(opts);
    const r4 = await rateLimit(opts);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r4.allowed).toBe(false);
    expect(r4.retryAfterSeconds).toBeGreaterThan(0);
    expect(r4.remaining).toBe(0);
  });

  it("returns decreasing `remaining` counts", async () => {
    vi.resetModules();
    mockRedisWithStore();
    const { rateLimit } = await import("../lib/rate-limit");
    const opts = { key: "unit:remaining", windowSeconds: 60, max: 5 };
    const r1 = await rateLimit(opts);
    const r2 = await rateLimit(opts);
    expect(r1.remaining).toBe(4);
    expect(r2.remaining).toBe(3);
  });

  it("sets TTL on the first request in a window", async () => {
    vi.resetModules();
    mockRedisWithStore();
    const { rateLimit } = await import("../lib/rate-limit");
    const opts = { key: "unit:ttl", windowSeconds: 30, max: 5 };
    await rateLimit(opts);
    const entry = store.get("voyana:rl:unit:ttl");
    expect(entry?.ttl).toBe(30);
  });
});

describe("rateLimit — fail-open behavior", () => {
  it("allows when Redis is unconfigured", async () => {
    vi.resetModules();
    mockRedisUnavailable();
    const { rateLimit } = await import("../lib/rate-limit");
    const r = await rateLimit({ key: "unit:noredis", windowSeconds: 60, max: 1 });
    expect(r.allowed).toBe(true);
    expect(r.retryAfterSeconds).toBe(0);
  });

  it("allows when Redis throws", async () => {
    vi.resetModules();
    mockRedisThrows();
    const { rateLimit } = await import("../lib/rate-limit");
    const r = await rateLimit({ key: "unit:throws", windowSeconds: 60, max: 1 });
    expect(r.allowed).toBe(true);
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 with Retry-After header", async () => {
    vi.resetModules();
    mockRedisUnavailable();
    const { rateLimitResponse } = await import("../lib/rate-limit");
    const res = rateLimitResponse({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 30_000,
      retryAfterSeconds: 30,
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBeTruthy();
  });

  it("Retry-After is at least 1", async () => {
    vi.resetModules();
    mockRedisUnavailable();
    const { rateLimitResponse } = await import("../lib/rate-limit");
    const res = rateLimitResponse({
      allowed: false,
      remaining: 0,
      resetAt: Date.now(),
      retryAfterSeconds: 0,
    });
    expect(res.headers.get("Retry-After")).toBe("1");
  });
});

describe("ipFromRequest", () => {
  it("prefers the first entry in x-forwarded-for", async () => {
    vi.resetModules();
    mockRedisUnavailable();
    const { ipFromRequest } = await import("../lib/rate-limit");
    const req = new Request("http://x/", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(ipFromRequest(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", async () => {
    vi.resetModules();
    mockRedisUnavailable();
    const { ipFromRequest } = await import("../lib/rate-limit");
    const req = new Request("http://x/", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(ipFromRequest(req)).toBe("9.9.9.9");
  });

  it('returns "unknown" when no headers are present', async () => {
    vi.resetModules();
    mockRedisUnavailable();
    const { ipFromRequest } = await import("../lib/rate-limit");
    const req = new Request("http://x/");
    expect(ipFromRequest(req)).toBe("unknown");
  });
});
