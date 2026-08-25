import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  getIntervalExerciseBySlug,
  getIntervalSessionById,
  getIntervalSessionsPage,
  getLatestIntervalSession,
} from "./queries";

const testRunId = `interval-query-${Date.now()}`;
const userAId = `${testRunId}-user-a`;
const userBId = `${testRunId}-user-b`;
const userALogId = `${testRunId}-log-a`;
const userBLogId = `${testRunId}-log-b`;
const userAExerciseId = `${testRunId}-exercise-a`;
const userBExerciseId = `${testRunId}-exercise-b`;
const wrongKindExerciseId = `${testRunId}-exercise-pace`;
const oldestId = `${testRunId}-session-oldest`;
const backdatedId = `${testRunId}-session-backdated`;
const sameDateOldId = `${testRunId}-session-same-a`;
const sameDateNewId = `${testRunId}-session-same-b`;
const tieEarlierId = `${testRunId}-session-tie-a`;
const tieCurrentId = `${testRunId}-session-tie-b`;
const foreignSessionId = `${testRunId}-session-foreign`;
const wrongKindSessionId = `${testRunId}-session-wrong-kind`;

function intervalSessionData({
  id,
  userId,
  logId,
  exerciseId,
  performedAt,
  createdAt,
}: {
  id: string;
  userId: string;
  logId: string;
  exerciseId: string;
  performedAt: Date;
  createdAt: Date;
}) {
  return {
    id,
    userId,
    logId,
    exerciseId,
    performedAt,
    createdAt,
    rounds: 6,
    workSeconds: 30,
    recoverySeconds: 60,
    includeFinalRecovery: false,
    totalWorkSeconds: 180,
    totalRecoverySeconds: 300,
    intervalBlockSeconds: 480,
  };
}

describe("interval queries", () => {
  beforeEach(async () => {
    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: `${userAId}@example.test`,
          name: "Interval Query User A",
        },
        {
          id: userBId,
          email: `${userBId}@example.test`,
          name: "Interval Query User B",
        },
      ],
    });

    await prisma.log.createMany({
      data: [
        {
          id: userALogId,
          userId: userAId,
          title: "Visible Log",
          slug: "running-log",
        },
        {
          id: userBLogId,
          userId: userBId,
          title: "Hidden Log",
          slug: "running-log",
        },
      ],
    });

    await prisma.exercise.createMany({
      data: [
        {
          id: userAExerciseId,
          userId: userAId,
          logId: userALogId,
          title: "Track Sprints",
          slug: "track-sprints",
          sessionKind: SessionKind.INTERVAL,
        },
        {
          id: userBExerciseId,
          userId: userBId,
          logId: userBLogId,
          title: "Hidden Sprints",
          slug: "track-sprints",
          sessionKind: SessionKind.INTERVAL,
        },
        {
          id: wrongKindExerciseId,
          userId: userAId,
          logId: userALogId,
          title: "Tempo Run",
          slug: "tempo-run",
          sessionKind: SessionKind.PACE,
        },
      ],
    });

    const samePerformedAt = new Date("2026-05-18T00:00:00.000Z");
    const sameCreatedAt = new Date("2026-05-19T10:00:00.000Z");

    await prisma.intervalSession.createMany({
      data: [
        intervalSessionData({
          id: oldestId,
          userId: userAId,
          logId: userALogId,
          exerciseId: userAExerciseId,
          performedAt: new Date("2026-05-15T00:00:00.000Z"),
          createdAt: new Date("2026-05-15T08:00:00.000Z"),
        }),
        intervalSessionData({
          id: backdatedId,
          userId: userAId,
          logId: userALogId,
          exerciseId: userAExerciseId,
          performedAt: new Date("2026-05-16T00:00:00.000Z"),
          createdAt: new Date("2026-06-01T08:00:00.000Z"),
        }),
        intervalSessionData({
          id: sameDateOldId,
          userId: userAId,
          logId: userALogId,
          exerciseId: userAExerciseId,
          performedAt: new Date("2026-05-17T00:00:00.000Z"),
          createdAt: new Date("2026-05-17T08:00:00.000Z"),
        }),
        intervalSessionData({
          id: sameDateNewId,
          userId: userAId,
          logId: userALogId,
          exerciseId: userAExerciseId,
          performedAt: new Date("2026-05-17T00:00:00.000Z"),
          createdAt: new Date("2026-05-17T09:00:00.000Z"),
        }),
        intervalSessionData({
          id: tieEarlierId,
          userId: userAId,
          logId: userALogId,
          exerciseId: userAExerciseId,
          performedAt: samePerformedAt,
          createdAt: sameCreatedAt,
        }),
        intervalSessionData({
          id: tieCurrentId,
          userId: userAId,
          logId: userALogId,
          exerciseId: userAExerciseId,
          performedAt: samePerformedAt,
          createdAt: sameCreatedAt,
        }),
        intervalSessionData({
          id: foreignSessionId,
          userId: userBId,
          logId: userBLogId,
          exerciseId: userBExerciseId,
          performedAt: new Date("2026-05-20T00:00:00.000Z"),
          createdAt: new Date("2026-05-20T08:00:00.000Z"),
        }),
        intervalSessionData({
          id: wrongKindSessionId,
          userId: userAId,
          logId: userALogId,
          exerciseId: wrongKindExerciseId,
          performedAt: new Date("2026-05-21T00:00:00.000Z"),
          createdAt: new Date("2026-05-21T08:00:00.000Z"),
        }),
      ],
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("finds only owned interval exercises by scoped slugs", async () => {
    const [userAExercise, userBExercise, wrongKindExercise] = await Promise.all([
      getIntervalExerciseBySlug({
        userId: userAId,
        logSlug: "running-log",
        exerciseSlug: "track-sprints",
      }),
      getIntervalExerciseBySlug({
        userId: userBId,
        logSlug: "running-log",
        exerciseSlug: "track-sprints",
      }),
      getIntervalExerciseBySlug({
        userId: userAId,
        logSlug: "running-log",
        exerciseSlug: "tempo-run",
      }),
    ]);

    expect(userAExercise?.title).toBe("Track Sprints");
    expect(userBExercise?.title).toBe("Hidden Sprints");
    expect(wrongKindExercise).toBeNull();
  });

  it("normalizes pagination and returns descending owned interval history", async () => {
    const result = await getIntervalSessionsPage({
      userId: userAId,
      exerciseId: userAExerciseId,
      page: 99,
      limit: 100,
    });

    expect(result.sessions.map((session) => session.id)).toEqual([
      tieCurrentId,
      tieEarlierId,
      sameDateNewId,
      sameDateOldId,
      backdatedId,
      oldestId,
    ]);
    expect(result.pagination).toMatchObject({
      page: 1,
      limit: 48,
      totalItems: 6,
      totalPages: 1,
    });
  });

  it("returns the correct slice for a multi-page interval history", async () => {
    const result = await getIntervalSessionsPage({
      userId: userAId,
      exerciseId: userAExerciseId,
      page: 2,
      limit: 2,
    });

    expect(result.sessions.map((session) => session.id)).toEqual([
      sameDateNewId,
      sameDateOldId,
    ]);
    expect(result.pagination).toMatchObject({
      page: 2,
      limit: 2,
      totalItems: 6,
      totalPages: 3,
    });
  });

  it("rejects foreign, mismatched-parent, and wrong-kind session ids", async () => {
    const [foreignSession, mismatchedParent, wrongKindSession] =
      await Promise.all([
        getIntervalSessionById({
          userId: userAId,
          exerciseId: userAExerciseId,
          sessionId: foreignSessionId,
        }),
        getIntervalSessionById({
          userId: userAId,
          exerciseId: wrongKindExerciseId,
          sessionId: tieCurrentId,
        }),
        getIntervalSessionById({
          userId: userAId,
          exerciseId: wrongKindExerciseId,
          sessionId: wrongKindSessionId,
        }),
      ]);

    expect(foreignSession).toBeNull();
    expect(mismatchedParent).toBeNull();
    expect(wrongKindSession).toBeNull();
  });

  it("returns the latest session and honors exclusion", async () => {
    const [latest, latestWithoutCurrent] = await Promise.all([
      getLatestIntervalSession({
        userId: userAId,
        exerciseId: userAExerciseId,
      }),
      getLatestIntervalSession({
        userId: userAId,
        exerciseId: userAExerciseId,
        excludeSessionId: tieCurrentId,
      }),
    ]);

    expect(latest?.id).toBe(tieCurrentId);
    expect(latestWithoutCurrent?.id).toBe(tieEarlierId);
  });
});
