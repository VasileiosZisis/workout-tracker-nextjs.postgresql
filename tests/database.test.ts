import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTestDatabaseUrl, localTestDatabaseUrl, resolveTestDatabaseUrl } from "./database";

describe("dedicated integration database configuration", () => {
  let directory: string;
  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "workout-test-env-")); });
  afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

  it("defaults to the local test database, ignoring application and Vercel connection strings", () => {
    expect(loadTestDatabaseUrl({ DATABASE_URL: "postgresql://secret@production/app", DIRECT_URL: "postgresql://secret@production/app", DATABASE_URL_UNPOOLED: "postgresql://secret@production/app" }, join(directory, "missing.env")))
      .toBe(localTestDatabaseUrl);
  });
  it("uses only TEST_DATABASE_URL from the test env file, with explicit environment precedence", () => {
    const path = join(directory, ".env.test.local"), fromFile = "postgresql://test:test@localhost:5434/another_test", fromEnvironment = "postgresql://test:test@localhost:5435/ci_test";
    writeFileSync(path, `DATABASE_URL=postgresql://secret@production/app\nTEST_DATABASE_URL=${fromFile}\n`);
    expect(loadTestDatabaseUrl({}, path)).toBe(fromFile);
    expect(loadTestDatabaseUrl({ TEST_DATABASE_URL: fromEnvironment }, path)).toBe(fromEnvironment);
    expect(() => loadTestDatabaseUrl({ TEST_DATABASE_URL: "" }, path)).toThrow("TEST_DATABASE_URL");
    writeFileSync(path, "DATABASE_URL=postgresql://secret@production/app\n");
    expect(loadTestDatabaseUrl({}, path)).toBe(localTestDatabaseUrl);
  });
  it.each(["", "not-a-url", "https://private:secret@example.com/database", "postgresql://private:secret@localhost", "postgresql://private:secret@localhost/test#fragment"])("rejects invalid overrides without exposing credentials", (value) => {
    let message = "";
    try { resolveTestDatabaseUrl({ TEST_DATABASE_URL: value }); } catch (error) { message = (error as Error).message; }
    expect(message).toContain("TEST_DATABASE_URL"); expect(message).not.toContain("private"); expect(message).not.toContain("secret");
  });
});
