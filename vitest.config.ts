/**
 * Default vitest config = INTEGRATION tests.
 * - Runs the safety-guarded env bootstrap (tests/env.ts).
 * - Serializes everything so DB truncations don't race.
 *
 * Unit tests use vitest.unit.config.ts which has NO db bootstrap so you can
 * run them without provisioning a Postgres.
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/purchase-lead.test.ts"],
    setupFiles: ["tests/env.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    globals: false,
    fileParallelism: false,
    sequence: { hooks: "list", concurrent: false },
    reporters: ["default"],
    isolate: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Next's server-only guard is a no-op in tests.
      "server-only": path.resolve(__dirname, "tests/shims/server-only.ts"),
    },
  },
});
