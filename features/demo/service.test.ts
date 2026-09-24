import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { deleteDemoUser, deleteExpiredDemoUsers } from "./lifecycle";
import {
  createDemoSandbox,
  DemoCapacityError,
} from "./service";

const createdUserIds: string[] = [];
const sandboxNow = new Date("2026-07-19T12:00:00.000Z");
const sandboxExpiration = new Date("2026-07-19T14:00:00.000Z");

describe("temporary demo service", () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        demoExpiresAt: sandboxExpiration,
        name: "Demo Athlete",
      },
    });
  });

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
    const first = await createDemoSandbox({ now: sandboxNow });
    createdUserIds.push(first.user.id);
    const second = await createDemoSandbox({ now: sandboxNow });
    createdUserIds.push(second.user.id);

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
        intervalSessions: true,
      },
    });

    expect(first.user.id).not.toBe(second.user.id);
    expect(sandbox.demoExpiresAt).toEqual(sandboxExpiration);
    expect(sandbox.logs).toHaveLength(2);
    expect(sandbox.exercises).toHaveLength(4);
    expect(sandbox.weightliftingSessions).toHaveLength(10);
    expect(sandbox.paceSessions).toHaveLength(6);
    expect(sandbox.intervalSessions).toHaveLength(6);
    expect(sandbox.sessions).toHaveLength(1);
    expect(Number(sandbox.weightliftingSessions[0].totalVolume)).toBeGreaterThan(
      0,
    );
    expect(sandbox.weightliftingSessions.every((session) => session.sets.length === 3)).toBe(
      true,
    );
    expect(Number(sandbox.paceSessions[0].pace)).toBeGreaterThan(0);

    const runningLog = sandbox.logs.find((log) => log.slug === "running");
    const trackSprints = sandbox.exercises.find(
      (exercise) => exercise.slug === "track-sprints",
    );

    expect(trackSprints).toMatchObject({
      title: "Track Sprints",
      logId: runningLog?.id,
      sessionKind: SessionKind.INTERVAL,
    });

    const intervalProtocols = sandbox.intervalSessions
      .slice()
      .sort(
        (left, right) =>
          left.performedAt.getTime() - right.performedAt.getTime(),
      )
      .map((session) => ({
        performedAt: session.performedAt.toISOString(),
        exerciseId: session.exerciseId,
        rounds: session.rounds,
        workSeconds: session.workSeconds,
        recoverySeconds: session.recoverySeconds,
        includeFinalRecovery: session.includeFinalRecovery,
        totalWorkSeconds: session.totalWorkSeconds,
        totalRecoverySeconds: session.totalRecoverySeconds,
        intervalBlockSeconds: session.intervalBlockSeconds,
      }));

    expect(intervalProtocols).toEqual([
      {
        performedAt: "2026-05-10T00:00:00.000Z",
        exerciseId: trackSprints?.id,
        rounds: 6,
        workSeconds: 20,
        recoverySeconds: 60,
        includeFinalRecovery: false,
        totalWorkSeconds: 120,
        totalRecoverySeconds: 300,
        intervalBlockSeconds: 420,
      },
      {
        performedAt: "2026-05-24T00:00:00.000Z",
        exerciseId: trackSprints?.id,
        rounds: 8,
        workSeconds: 20,
        recoverySeconds: 60,
        includeFinalRecovery: false,
        totalWorkSeconds: 160,
        totalRecoverySeconds: 420,
        intervalBlockSeconds: 580,
      },
      {
        performedAt: "2026-06-07T00:00:00.000Z",
        exerciseId: trackSprints?.id,
        rounds: 8,
        workSeconds: 30,
        recoverySeconds: 60,
        includeFinalRecovery: false,
        totalWorkSeconds: 240,
        totalRecoverySeconds: 420,
        intervalBlockSeconds: 660,
      },
      {
        performedAt: "2026-06-21T00:00:00.000Z",
        exerciseId: trackSprints?.id,
        rounds: 10,
        workSeconds: 30,
        recoverySeconds: 60,
        includeFinalRecovery: true,
        totalWorkSeconds: 300,
        totalRecoverySeconds: 600,
        intervalBlockSeconds: 900,
      },
      {
        performedAt: "2026-07-05T00:00:00.000Z",
        exerciseId: trackSprints?.id,
        rounds: 10,
        workSeconds: 30,
        recoverySeconds: 45,
        includeFinalRecovery: false,
        totalWorkSeconds: 300,
        totalRecoverySeconds: 405,
        intervalBlockSeconds: 705,
      },
      {
        performedAt: "2026-07-18T00:00:00.000Z",
        exerciseId: trackSprints?.id,
        rounds: 12,
        workSeconds: 30,
        recoverySeconds: 45,
        includeFinalRecovery: false,
        totalWorkSeconds: 360,
        totalRecoverySeconds: 495,
        intervalBlockSeconds: 855,
      },
    ]);
    expect(
      sandbox.intervalSessions.filter((session) => session.includeFinalRecovery),
    ).toHaveLength(1);
  }, 15_000);

  it("enforces capacity and removes only expired demo users", async () => {
    const active = await createDemoSandbox({
      now: sandboxNow,
      maxActiveUsers: 1,
    });
    createdUserIds.push(active.user.id);

    await expect(
      createDemoSandbox({ now: sandboxNow, maxActiveUsers: 1 }),
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

    const deleted = await deleteExpiredDemoUsers(sandboxNow);

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
