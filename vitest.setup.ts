import { vi } from "vitest";

// Tests do not need application credentials or the application's .env file.
// Individual suites can still override this module for auth policy scenarios.
vi.mock("@/lib/env", async () => {
  const { parseEnvironment } = await import("@/lib/env-schema");
  return { env: parseEnvironment({
    NODE_ENV: "test", DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: "workout-tests-only-secret-not-for-deployment",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000", DEMO_ENABLED: "false",
  }) };
});
