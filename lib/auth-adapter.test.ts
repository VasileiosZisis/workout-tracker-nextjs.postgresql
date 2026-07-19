import { authAdapter } from "@/lib/auth-adapter";
import { prisma } from "@/lib/db";

const testRunId = `demo-auth-adapter-${Date.now()}`;
const userIds: string[] = [];

describe("demo-aware Auth.js adapter", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: userIds.splice(0) } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects an expired demo session and deletes its user", async () => {
    const userId = `${testRunId}-expired`;
    const sessionToken = `${testRunId}-expired-session`;
    userIds.push(userId);
    await prisma.user.create({
      data: {
        id: userId,
        demoExpiresAt: new Date("2000-01-01T10:00:00.000Z"),
        sessions: {
          create: {
            sessionToken,
            expires: new Date("2000-01-01T10:00:00.000Z"),
          },
        },
      },
    });

    expect(await authAdapter.getSessionAndUser!(sessionToken)).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
  });

  it("does not extend an active demo session", async () => {
    const userId = `${testRunId}-active`;
    const sessionToken = `${testRunId}-active-session`;
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    userIds.push(userId);
    await prisma.user.create({
      data: {
        id: userId,
        demoExpiresAt: expires,
        sessions: {
          create: { sessionToken, expires },
        },
      },
    });

    await authAdapter.updateSession!({
      sessionToken,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const session = await prisma.session.findUniqueOrThrow({
      where: { sessionToken },
    });
    expect(session.expires).toEqual(expires);
  });

  it("preserves normal database-session updates", async () => {
    const userId = `${testRunId}-normal`;
    const sessionToken = `${testRunId}-normal-session`;
    const originalExpiry = new Date(Date.now() + 60 * 60 * 1000);
    const nextExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);
    userIds.push(userId);
    await prisma.user.create({
      data: {
        id: userId,
        sessions: {
          create: { sessionToken, expires: originalExpiry },
        },
      },
    });

    await authAdapter.updateSession!({ sessionToken, expires: nextExpiry });

    const session = await prisma.session.findUniqueOrThrow({
      where: { sessionToken },
    });
    expect(session.expires).toEqual(nextExpiry);
  });
});
