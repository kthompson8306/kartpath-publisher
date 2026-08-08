import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Use TEST_DATABASE_URL as DATABASE_URL so the db module connects to the
    // isolated test database, not the live application database.
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
    },
    setupFiles: ["./src/__tests__/setup.ts"],
    // Run tests sequentially in a single fork so DB operations don't race.
    pool: "forks",
    singleFork: true,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@workspace/db": resolve(__dirname, "../../lib/db/src/index.ts"),
      "@workspace/api-zod": resolve(__dirname, "../../lib/api-zod/src/index.ts"),
    },
  },
});
