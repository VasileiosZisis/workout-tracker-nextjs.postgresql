import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { integrationFiles } from "./tests/integration-files";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    maxWorkers: 4,
    projects: [
      {
        extends: true,
        test: {
          name: "unit", environment: "node", globals: true,
          include: ["**/*.{test,spec}.ts"],
          exclude: ["node_modules/**", ".next/**", "generated/**", ...integrationFiles],
          setupFiles: ["./tests/setup-unit.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration", environment: "node", globals: true,
          include: integrationFiles,
          exclude: ["node_modules/**", ".next/**", "generated/**"],
          // Shared database fixtures and lifecycle tests remain serialized.
          fileParallelism: false,
          setupFiles: ["./tests/setup-integration.ts"],
        },
      },
    ],
  },
});
