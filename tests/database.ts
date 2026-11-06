import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

export const localTestDatabaseUrl = "postgresql://workout_test:workout_test@127.0.0.1:5433/workout_tracker_test";

export function resolveTestDatabaseUrl(source: Pick<NodeJS.ProcessEnv, "TEST_DATABASE_URL">) {
  const value = source.TEST_DATABASE_URL === undefined ? localTestDatabaseUrl : source.TEST_DATABASE_URL.trim();
  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length <= 1 || url.hash) throw new Error("Invalid database URL");
  } catch {
    // Never include the connection string (credentials) in the error.
    throw new Error("TEST_DATABASE_URL must be a PostgreSQL connection string with a database name.");
  }
  return value;
}

export function loadTestDatabaseUrl(source: Readonly<Record<string, string | undefined>> = process.env,
  path = fileURLToPath(new URL("../.env.test.local", import.meta.url))) {
  const file: Record<string, string> = existsSync(path) ? parse(readFileSync(path)) : {};
  return resolveTestDatabaseUrl({ TEST_DATABASE_URL: source.TEST_DATABASE_URL ?? file.TEST_DATABASE_URL });
}
