/**
 * Test-suite bootstrap.
 *
 * PURPOSE:
 * - Load `.env.test` if present (so devs don't have to export env vars).
 * - Verify that a TEST_DATABASE_URL exists and is DEMONSTRABLY NOT production.
 * - Repoint `DATABASE_URL` + `DIRECT_URL` at the test DB before Prisma is
 *   instantiated anywhere else.
 *
 * This file runs FIRST via vitest.config.ts `setupFiles`. If the safety
 * checks reject, every test in the process fails with the same clear error.
 *
 * SAFETY DESIGN:
 * We refuse to run unless the test URL either:
 *   (a) contains the substring "test" in the DB name (post `/`) OR the host, OR
 *   (b) is 127.0.0.1 / localhost (developer-local), OR
 *   (c) has `ALLOW_TEST_DB_OVERRIDE=1` set (escape hatch for CI setups)
 * AND is not identical to any of these production markers:
 *   - The current `DATABASE_URL` (if it was set before the test process started)
 *   - Any URL matching PROD_URL_PATTERNS (e.g. supabase.co pooler hosts)
 */

import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";

// 1. Load .env.test first (does NOT override existing process.env)
if (existsSync(".env.test")) {
  loadEnv({ path: ".env.test" });
}

const testUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testUrl) {
  throw new Error(
    [
      "SAFETY: TEST_DATABASE_URL is not set.",
      "Create a .env.test file at the repo root with:",
      "  TEST_DATABASE_URL=postgresql://postgres:test@localhost:5433/voyana_test",
      "(or export it in your shell). See tests/README.md for the full setup.",
    ].join("\n"),
  );
}

// Capture whatever DATABASE_URL was set BEFORE our overrides. This is the
// live/dev/prod URL we must never accidentally reuse.
const preExistingDbUrl = process.env.DATABASE_URL?.trim();

// Prod-pattern signatures — expand as needed.
const PROD_URL_PATTERNS = [
  /pooler\.supabase\.com/i,
  /supabase\.co(?!.*test)/i,
];

function looksLikeTestUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const dbName = u.pathname.replace(/^\//, "").toLowerCase();
    const host = u.hostname.toLowerCase();
    return (
      dbName.includes("test") ||
      host.includes("test") ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1"
    );
  } catch {
    return false;
  }
}

const escapeHatch = process.env.ALLOW_TEST_DB_OVERRIDE === "1";

if (!escapeHatch) {
  if (preExistingDbUrl && preExistingDbUrl === testUrl) {
    throw new Error(
      "SAFETY: TEST_DATABASE_URL is identical to the current DATABASE_URL. " +
        "Point tests at a distinct, disposable database.",
    );
  }
  for (const pat of PROD_URL_PATTERNS) {
    if (pat.test(testUrl)) {
      throw new Error(
        `SAFETY: TEST_DATABASE_URL matches a production pattern (${pat}). ` +
          "Set ALLOW_TEST_DB_OVERRIDE=1 only if you are absolutely sure this DB is disposable.",
      );
    }
  }
  if (!looksLikeTestUrl(testUrl)) {
    throw new Error(
      "SAFETY: TEST_DATABASE_URL must include the substring 'test' in the DB name or host, " +
        "or point at localhost. Rename the DB or set ALLOW_TEST_DB_OVERRIDE=1 to bypass (not recommended).",
    );
  }
}

// Repoint Prisma at the test DB. Every subsequent import of lib/db will see this.
process.env.DATABASE_URL = testUrl;
process.env.DIRECT_URL = testUrl;

// Redis stays disabled by default in tests to keep them deterministic and offline.
// (Rate-limit and lockout libs fail open in this state — see their headers.)
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

// Suppress noisy console.log/info in test output — real errors still print.
if (!process.env.VERBOSE_TESTS) {
  const noop = () => undefined;
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}
