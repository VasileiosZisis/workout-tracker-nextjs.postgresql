import { vi } from "vitest";
import {
  checkEmailSignInRateLimit,
  EMAIL_RATE_LIMIT,
  IP_RATE_LIMIT,
  RATE_LIMIT_WINDOW_MS,
  type RateLimitStore,
  type RateLimitTransactionRunner,
} from "./auth-email-rate-limit";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/env", () => ({ env: { AUTH_SECRET: "s".repeat(32) } }));

interface StoredBucket {
  count: number;
  expiresAt: Date;
  kind: "EMAIL" | "IP";
}

function createMemoryStore() {
  const buckets = new Map<string, StoredBucket>();
  const store: RateLimitStore = {
    async deleteExpired(expiredAt) {
      for (const [id, bucket] of buckets) {
        if (bucket.expiresAt.getTime() <= expiredAt.getTime()) {
          buckets.delete(id);
        }
      }
    },
    async increment(bucket) {
      const existing = buckets.get(bucket.id);
      const count = (existing?.count ?? 0) + 1;

      buckets.set(bucket.id, {
        count,
        expiresAt: bucket.expiresAt,
        kind: bucket.kind,
      });

      return count;
    },
  };
  const runTransaction: RateLimitTransactionRunner = (callback) =>
    callback(store);

  return { buckets, runTransaction };
}

const secret = "s".repeat(32);
const start = new Date("2026-08-14T12:00:00.000Z");

describe("email sign-in rate limiting", () => {
  it("allows five email requests and rejects the sixth", async () => {
    const { runTransaction } = createMemoryStore();
    const headers = new Headers();

    for (let attempt = 0; attempt < EMAIL_RATE_LIMIT; attempt += 1) {
      await expect(
        checkEmailSignInRateLimit("USER@example.com", headers, {
          now: start,
          runTransaction,
          secret,
        }),
      ).resolves.toBe(true);
    }

    await expect(
      checkEmailSignInRateLimit("user@example.com", headers, {
        now: start,
        runTransaction,
        secret,
      }),
    ).resolves.toBe(false);
  });

  it("limits requests across different emails from the same Vercel IP", async () => {
    const { runTransaction } = createMemoryStore();
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.10",
    });

    for (let attempt = 0; attempt < IP_RATE_LIMIT; attempt += 1) {
      await expect(
        checkEmailSignInRateLimit(`user-${attempt}@example.com`, headers, {
          now: start,
          runTransaction,
          secret,
        }),
      ).resolves.toBe(true);
    }

    await expect(
      checkEmailSignInRateLimit("blocked@example.com", headers, {
        now: start,
        runTransaction,
        secret,
      }),
    ).resolves.toBe(false);
  });

  it("uses the first trusted forwarded address", async () => {
    const { runTransaction } = createMemoryStore();

    for (let attempt = 0; attempt < IP_RATE_LIMIT; attempt += 1) {
      await checkEmailSignInRateLimit(
        `user-${attempt}@example.com`,
        new Headers({
          "x-forwarded-for": "198.51.100.2",
          "x-real-ip": "198.51.100.3",
          "x-vercel-forwarded-for": "198.51.100.1, 198.51.100.4",
        }),
        { now: start, runTransaction, secret },
      );
    }

    await expect(
      checkEmailSignInRateLimit(
        "blocked@example.com",
        new Headers({
          "x-forwarded-for": "203.0.113.20",
          "x-vercel-forwarded-for": "198.51.100.1",
        }),
        { now: start, runTransaction, secret },
      ),
    ).resolves.toBe(false);
  });

  it("skips the IP bucket when no client address is available", async () => {
    const { buckets, runTransaction } = createMemoryStore();

    await checkEmailSignInRateLimit("user@example.com", new Headers(), {
      now: start,
      runTransaction,
      secret,
    });

    expect([...buckets.values()].map(({ kind }) => kind)).toEqual(["EMAIL"]);
  });

  it("resets counters in the next window and removes expired buckets", async () => {
    const { buckets, runTransaction } = createMemoryStore();

    for (let attempt = 0; attempt <= EMAIL_RATE_LIMIT; attempt += 1) {
      await checkEmailSignInRateLimit("user@example.com", new Headers(), {
        now: start,
        runTransaction,
        secret,
      });
    }

    await expect(
      checkEmailSignInRateLimit("user@example.com", new Headers(), {
        now: new Date(start.getTime() + RATE_LIMIT_WINDOW_MS),
        runTransaction,
        secret,
      }),
    ).resolves.toBe(true);
    expect(buckets.size).toBe(1);
    expect([...buckets.values()][0]?.count).toBe(1);
  });

  it("stores hashes instead of raw email or IP identifiers", async () => {
    const { buckets, runTransaction } = createMemoryStore();
    const email = "private@example.com";
    const ip = "192.0.2.15";

    await checkEmailSignInRateLimit(
      email,
      new Headers({ "x-vercel-forwarded-for": ip }),
      { now: start, runTransaction, secret },
    );

    for (const id of buckets.keys()) {
      expect(id).toMatch(/^[a-f0-9]{64}$/);
      expect(id).not.toContain(email);
      expect(id).not.toContain(ip);
    }
  });
});
