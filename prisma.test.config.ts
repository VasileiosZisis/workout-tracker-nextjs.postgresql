import { defineConfig } from "prisma/config";
import { loadTestDatabaseUrl } from "./tests/database";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: loadTestDatabaseUrl() },
});
