import "../vitest.setup";
import { loadTestDatabaseUrl } from "./database";

// Explicit test configuration only. Never fall back to DATABASE_URL/DIRECT_URL
// from the application or load the application's .env file.
const databaseUrl = loadTestDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = databaseUrl;
