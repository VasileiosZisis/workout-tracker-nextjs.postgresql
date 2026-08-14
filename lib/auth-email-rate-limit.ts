import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const EMAIL_RATE_LIMIT = 5;
export const IP_RATE_LIMIT = 25;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

type RateLimitKind = "EMAIL" | "IP";

interface RateLimitBucket {
  expiresAt: Date;
  id: string;
  kind: RateLimitKind;
}

export interface RateLimitStore {
  deleteExpired(expiredAt: Date): Promise<void>;
  increment(bucket: RateLimitBucket): Promise<number>;
}

export type RateLimitTransactionRunner = <Result>(
  callback: (store: RateLimitStore) => Promise<Result>,
) => Promise<Result>;

interface RateLimitOptions {
  now?: Date;
  runTransaction?: RateLimitTransactionRunner;
  secret?: string;
}

interface HeadersReader {
  get(name: string): string | null;
}

const runPrismaTransaction: RateLimitTransactionRunner = (callback) =>
  prisma.$transaction(async (transaction) =>
    callback({
      async deleteExpired(expiredAt) {
        await transaction.authRateLimitBucket.deleteMany({
          where: { expiresAt: { lte: expiredAt } },
        });
      },
      async increment(bucket) {
        const stored = await transaction.authRateLimitBucket.upsert({
          where: { id: bucket.id },
          create: {
            count: 1,
            expiresAt: bucket.expiresAt,
            id: bucket.id,
            kind: bucket.kind,
          },
          update: {
            count: { increment: 1 },
          },
          select: { count: true },
        });

        return stored.count;
      },
    }),
  );

function getForwardedAddress(requestHeaders: HeadersReader) {
  for (const headerName of [
    "x-vercel-forwarded-for",
    "x-forwarded-for",
    "x-real-ip",
  ]) {
    const value = requestHeaders.get(headerName)?.split(",")[0]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

function createBucket(
  kind: RateLimitKind,
  identifier: string,
  now: Date,
  secret: string,
): RateLimitBucket {
  const windowStartedAt =
    Math.floor(now.getTime() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  const expiresAt = new Date(windowStartedAt + RATE_LIMIT_WINDOW_MS);
  const id = createHmac("sha256", secret)
    .update(`${kind}\0${identifier}\0${windowStartedAt}`)
    .digest("hex");

  return { expiresAt, id, kind };
}

export async function checkEmailSignInRateLimit(
  email: string,
  requestHeaders: HeadersReader,
  options: RateLimitOptions = {},
) {
  const now = options.now ?? new Date();
  const runTransaction = options.runTransaction ?? runPrismaTransaction;
  const secret = options.secret ?? env.AUTH_SECRET;
  const normalizedEmail = email.normalize("NFKC").trim().toLowerCase();
  const clientAddress = getForwardedAddress(requestHeaders);

  return runTransaction(async (store) => {
    await store.deleteExpired(now);

    if (clientAddress) {
      const ipCount = await store.increment(
        createBucket("IP", clientAddress, now, secret),
      );

      if (ipCount > IP_RATE_LIMIT) {
        return false;
      }
    }

    const emailCount = await store.increment(
      createBucket("EMAIL", normalizedEmail, now, secret),
    );

    return emailCount <= EMAIL_RATE_LIMIT;
  });
}
