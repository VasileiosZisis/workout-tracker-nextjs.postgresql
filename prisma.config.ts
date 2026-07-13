import "dotenv/config";
import { defineConfig } from "prisma/config";

const isVercel = process.env.VERCEL === "1";
const migrationUrl = (
  isVercel ? process.env.DATABASE_URL_UNPOOLED : process.env.DIRECT_URL
)?.trim();

if (!migrationUrl) {
  throw new Error(
    isVercel
      ? "DATABASE_URL_UNPOOLED is required for Prisma commands on Vercel."
      : "DIRECT_URL is required for local Prisma commands.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
