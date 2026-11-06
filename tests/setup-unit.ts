import "../vitest.setup";
import { vi } from "vitest";

process.env.DATABASE_URL = "postgresql://unit:unit@127.0.0.1:1/unit_tests_do_not_connect";

// A newly added database suite must opt in to the integration project. It must
// never silently connect to a developer's remote app database during npm test.
vi.mock("@/lib/db", () => ({
  prisma: new Proxy({}, {
    get() { throw new Error("A unit test accessed Prisma. Mock @/lib/db, or register the suite as an integration test and run npm run test:integration."); },
  }),
}));
