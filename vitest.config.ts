import { defineConfig } from "vitest/config";

/**
 * Unit tests (Step4)
 * - Keep tests focused on pure functions & adapters.
 * - No browser APIs are used.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    reporters: ["default"],
  },
});
