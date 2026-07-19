import { prisma } from "@/lib/db";
import { deleteDemoUser, deleteExpiredDemoUsers } from "./lifecycle";
import {
  createDemoSandbox,
  DemoCapacityError,
} from "./service";

const createdUserIds: string[] = [];

describe("temporary demo service", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: createdUserIds.splice(0),
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates an isolated two-hour sandbox with representative history", async () => {
    const now = new Date("2026-07-19T12:00:00.000Z");
    const first = await createDemoSandbox({ now });
    const second = await createDemoSandbox({ now });
    createdUserIds.push(first.user.id, second.user.id);

    const sandbox = await prisma.user.findUniqueOrThrow({
      where: { id: first.user.id },
      include: {
        logs: true,
        exercises: true,
        sessions: true,
        weightliftingSessions: {
          include: { sets: true },
        },
        paceSessions: true,
      },
    });

    expect(first.user.id).not.toBe(second.user.id);
    expect(sandbox.demoExpiresAt).toEqual(
      new Date("2026-07-19T14:00:00.000Z"),
    );
    expect(sandbox.logs).toHaveLength(2);
    expect(sandbox.exercises).toHaveLength(3);
    expect(sandbox.weightliftingSessions).toHaveLength(10);
    expect(sandbox.paceSessions).toHaveLength(6);
    expect(sandbox.sessions).toHaveLength(1);
    expect(Number(sandbox.weightliftingSessions[0].totalVolume)).toBeGreaterThan(
      0,
    );
    expect(sandbox.weightliftingSessions.every((session) => session.sets.length === 3)).toBe(
      true,
    );
    expect(Number(sandbox.paceSessions[0].pace)).toBeGreaterThan(0);
  });

  it("enforces capacity and removes only expired demo users", async () => {
    const now = new Date("2026-07-19T12:00:00.000Z");
    const active = await createDemoSandbox({ now, maxActiveUsers: 1 });
    createdUserIds.push(active.user.id);

    await expect(
      createDemoSandbox({ now, maxActiveUsers: 1 }),
    ).rejects.toBeInstanceOf(DemoCapacityError);

    const expired = await createDemoSandbox({
      now: new Date("2026-07-19T08:00:00.000Z"),
    });
    createdUserIds.push(expired.user.id);

    const normalUser = await prisma.user.create({
      data: {
        email: `normal-demo-cleanup-${Date.now()}@example.test`,
        name: "Normal User",
      },
    });
    createdUserIds.push(normalUser.id);

    const deleted = await deleteExpiredDemoUsers(now);

    expect(deleted.count).toBe(1);
    expect(await prisma.user.findUnique({ where: { id: active.user.id } })).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { id: normalUser.id } })).not.toBeNull();
  });

  it("deletes a demo user on exit without deleting a normal user", async () => {
    const sandbox = await createDemoSandbox();
    createdUserIds.push(sandbox.user.id);
    const normalUser = await prisma.user.create({
      data: {
        email: `normal-demo-exit-${Date.now()}@example.test`,
      },
    });
    createdUserIds.push(normalUser.id);

    expect((await deleteDemoUser(sandbox.user.id)).count).toBe(1);
    expect((await deleteDemoUser(normalUser.id)).count).toBe(0);
    expect(await prisma.user.findUnique({ where: { id: normalUser.id } })).not.toBeNull();
  });
});
