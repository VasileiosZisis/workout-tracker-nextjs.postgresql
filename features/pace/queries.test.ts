import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  getLatestPaceSession,
  getPaceExerciseBySlug,
  getPaceSessionById,
  getPaceSessionsPage,
} from "./queries";

const testRunId = `pace-query-${Date.now()}`;
const userAId = `${testRunId}-user-a`;
const userBId = `${testRunId}-user-b`;
const userALogId = `${testRunId}-log-a`;
const userBLogId = `${testRunId}-log-b`;
const userAExerciseId = `${testRunId}-exercise-a`;
const userBExerciseId = `${testRunId}-exercise-b`;
const userASessionId = `${testRunId}-session-a`;
const userBSessionId = `${testRunId}-session-b`;

describe("pace queries", () => {
  beforeEach(async () => {
    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: `${userAId}@example.test`,
          name: "Pace Query User A",
        },
        {
          id: userBId,
          email: `${userBId}@example.test`,
          name: "Pace Query User B",
        },
      ],
    });

    await prisma.log.createMany({
      data: [
        {
          id: userALogId,
          userId: userAId,
          title: "Visible Log",
          slug: "visible-log",
        },
        {
          id: userBLogId,
          userId: userBId,
          title: "Hidden Log",
          slug: "visible-log",
        },
      ],
    });

    await prisma.exercise.createMany({
      data: [
        {
          id: userAExerciseId,
          userId: userAId,
          logId: userALogId,
          title: "Visible Run",
          slug: "tempo-run",
          sessionKind: SessionKind.PACE,
        },
        {
          id: userBExerciseId,
          userId: userBId,
          logId: userBLogId,
          title: "Hidden Run",
          slug: "tempo-run",
          sessionKind: SessionKind.PACE,
        },
      ],
    });

    await prisma.paceSession.createMany({
      data: [
        {
          id: userASessionId,
          userId: userAId,
          logId: userALogId,
          exerciseId: userAExerciseId,
          performedAt: new Date("2026-05-17T00:00:00.000Z"),
          hours: 0,
          minutes: 25,
          seconds: 0,
          distance: "5.00",
          pace: "5.000",
          paceMinutes: 5,
          paceSeconds: 0,
          speed: "12.000",
        },
        {
          id: userBSessionId,
          userId: userBId,
          logId: userBLogId,
          exerciseId: userBExerciseId,
          performedAt: new Date("2026-05-18T00:00:00.000Z"),
          hours: 0,
          minutes: 50,
          seconds: 0,
          distance: "10.00",
          pace: "5.000",
          paceMinutes: 5,
          paceSeconds: 0,
          speed: "12.000",
        },
      ],
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [userAId, userBId],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("finds only owned pace exercises by scoped slugs", async () => {
    const [userAExercise, userBExercise] = await Promise.all([
      getPaceExerciseBySlug({
        userId: userAId,
        logSlug: "visible-log",
        exerciseSlug: "tempo-run",
      }),
      getPaceExerciseBySlug({
        userId: userBId,
        logSlug: "visible-log",
        exerciseSlug: "tempo-run",
      }),
    ]);

    expect(userAExercise?.title).toBe("Visible Run");
    expect(userBExercise?.title).toBe("Hidden Run");
  });

  it("lists sessions only for the requested owned exercise", async () => {
    const result = await getPaceSessionsPage({
      userId: userAId,
      exerciseId: userAExerciseId,
      page: 1,
      limit: 12,
    });

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].id).toBe(userASessionId);
    expect(result.pagination.totalItems).toBe(1);
  });

  it("does not return another user's session by id", async () => {
    const session = await getPaceSessionById({
      userId: userAId,
      sessionId: userBSessionId,
    });

    expect(session).toBeNull();
  });

  it("returns the latest owned session for an exercise", async () => {
    const session = await getLatestPaceSession({
      userId: userAId,
      exerciseId: userAExerciseId,
    });

    expect(session?.id).toBe(userASessionId);
  });
});
