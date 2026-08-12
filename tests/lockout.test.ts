import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Unit tests for lib/auth/lockout — Redis mocked in-memory.
 */

const store = new Map<string, { count: number; ttl: number; setAt: number }>();

beforeEach(() => store.clear());

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
        return Math.max(0, entry.ttl - Math.floor((Date.now() - entry.setAt) / 1000));
      },
      async get<T>(key: string): Promise<T | null> {
        const entry = store.get(key);
        return (entry?.count ?? null) as T | null;
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

describe("lockout counters", () => {
  it("starts at zero for a fresh email", async () => {
    vi.resetModules();
    mockRedisWithStore();
    const { checkLoginLockout } = await import("../lib/auth/lockout");
    const state = await checkLoginLockout("fresh@test.local");
    expect(state.locked).toBe(false);
    if (!state.locked) expect(state.failedAttempts).toBe(0);
  });

  it("records failures monotonically", async () => {
    vi.resetModules();
    mockRedisWithStore();
    const { recordLoginFailure, checkLoginLockout } = await import("../lib/auth/lockout");
    await recordLoginFailure("a@test.local");
    await recordLoginFailure("a@test.local");
    const state = await checkLoginLockout("a@test.local");
    if (state.locked) throw new Error("Should not be locked yet");
    expect(state.failedAttempts).toBe(2);
  });

  it("locks the account after the 8th failure", async () => {
    vi.resetModules();
    mockRedisWithStore();
    const { recordLoginFailure, checkLoginLockout } = await import("../lib/auth/lockout");
    for (let i = 0; i < 8; i++) await recordLoginFailure("locked@test.local");
    const state = await checkLoginLockout("locked@test.local");
    expect(state.locked).toBe(true);
    if (state.locked) expect(state.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("returns a progressive delay hint that grows with each failure", async () => {
    vi.resetModules();
    mockRedisWithStore();
    const { recordLoginFailure } = await import("../lib/auth/lockout");
    const r1 = await recordLoginFailure("prog@test.local");
    const r2 = await recordLoginFailure("prog@test.local");
    const r3 = await recordLoginFailure("prog@test.local");
    expect(r1.delaySeconds).toBeLessThanOrEqual(r2.delaySeconds);
    expect(r2.delaySeconds).toBeLessThanOrEqual(r3.delaySeconds);
    expect(r3.failedAttempts).toBe(3);
  });

  it("clearLoginFailures resets the counter", async () => {
    vi.resetModules();
    mockRedisWithStore();
    const { recordLoginFailure, clearLoginFailures, checkLoginLockout } = await import("../lib/auth/lockout");
    await recordLoginFailure("cleared@test.local");
    await recordLoginFailure("cleared@test.local");
    await clearLoginFailures("cleared@test.local");
    const state = await checkLoginLockout("cleared@test.local");
    expect(state.locked).toBe(false);
    if (!state.locked) expect(state.failedAttempts).toBe(0);
  });

  it("is case-insensitive on email", async () => {
    vi.resetModules();
    mockRedisWithStore();
    const { recordLoginFailure, checkLoginLockout } = await import("../lib/auth/lockout");
    await recordLoginFailure("Case@Test.local");
    const state = await checkLoginLockout("case@test.local");
    if (state.locked) throw new Error("shouldn't lock yet");
    expect(state.failedAttempts).toBe(1);
  });
});

describe("lockout fail-open", () => {
  it("checkLoginLockout allows sign-in when Redis is down", async () => {
    vi.resetModules();
    mockRedisUnavailable();
    const { checkLoginLockout } = await import("../lib/auth/lockout");
    const state = await checkLoginLockout("nored@test.local");
    expect(state.locked).toBe(false);
  });

  it("recordLoginFailure returns zeroed state when Redis is down", async () => {
    vi.resetModules();
    mockRedisUnavailable();
    const { recordLoginFailure } = await import("../lib/auth/lockout");
    const r = await recordLoginFailure("nored@test.local");
    expect(r.delaySeconds).toBe(0);
    expect(r.failedAttempts).toBe(0);
  });
});
