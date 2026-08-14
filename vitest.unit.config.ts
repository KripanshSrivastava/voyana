/**
 * Unit tests — no DB, no env bootstrap. Runs the rate-limit and lockout
 * suites against mocked Redis so they can pass without any external infra.
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: [
      "tests/rate-limit.test.ts",
      "tests/lockout.test.ts",
      "tests/whatsapp-phone.test.ts",
      "tests/message-render.test.ts",
    ],
    testTimeout: 5_000,
    globals: false,
    reporters: ["default"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` is a Next.js runtime guard — under vitest there's no
      // client/server distinction, so alias to a no-op shim.
      "server-only": path.resolve(__dirname, "tests/shims/server-only.ts"),
    },
  },
});
