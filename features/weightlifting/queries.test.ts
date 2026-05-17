import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  getLatestWeightliftingSession,
  getWeightliftingExerciseBySlug,
  getWeightliftingSessionById,
  getWeightliftingSessionsPage,
} from "./queries";

const testRunId = `weightlifting-query-${Date.now()}`;
const userAId = `${testRunId}-user-a`;
const userBId = `${testRunId}-user-b`;
const userALogId = `${testRunId}-log-a`;
const userBLogId = `${testRunId}-log-b`;
const userAExerciseId = `${testRunId}-exercise-a`;
const userBExerciseId = `${testRunId}-exercise-b`;
const userASessionId = `${testRunId}-session-a`;
const userBSessionId = `${testRunId}-session-b`;

describe("weightlifting queries", () => {
  beforeEach(async () => {
    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: `${userAId}@example.test`,
          name: "Weightlifting Query User A",
        },
        {
          id: userBId,
          email: `${userBId}@example.test`,
          name: "Weightlifting Query User B",
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
          title: "Visible Bench",
          slug: "bench-press",
          sessionKind: SessionKind.WEIGHTLIFTING,
        },
        {
          id: userBExerciseId,
          userId: userBId,
          logId: userBLogId,
          title: "Hidden Bench",
          slug: "bench-press",
          sessionKind: SessionKind.WEIGHTLIFTING,
        },
      ],
    });

    await prisma.weightliftingSession.createMany({
      data: [
        {
          id: userASessionId,
          userId: userAId,
          logId: userALogId,
          exerciseId: userAExerciseId,
          performedAt: new Date("2026-05-17T00:00:00.000Z"),
          totalVolume: "100.00",
          junkVolume: "0.00",
          workingVolume: "100.00",
        },
        {
          id: userBSessionId,
          userId: userBId,
          logId: userBLogId,
          exerciseId: userBExerciseId,
          performedAt: new Date("2026-05-18T00:00:00.000Z"),
          totalVolume: "200.00",
          junkVolume: "200.00",
          workingVolume: "0.00",
        },
      ],
    });

    await prisma.weightliftingSet.createMany({
      data: [
        {
          sessionId: userASessionId,
          position: 1,
          repetitions: "1.00",
          kilograms: "100.00",
          isHard: true,
          volume: "100.00",
        },
        {
          sessionId: userBSessionId,
          position: 1,
          repetitions: "2.00",
          kilograms: "100.00",
          isHard: false,
          volume: "200.00",
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

  it("finds only owned weightlifting exercises by scoped slugs", async () => {
    const [userAExercise, userBExercise] = await Promise.all([
      getWeightliftingExerciseBySlug({
        userId: userAId,
        logSlug: "visible-log",
        exerciseSlug: "bench-press",
      }),
      getWeightliftingExerciseBySlug({
        userId: userBId,
        logSlug: "visible-log",
        exerciseSlug: "bench-press",
      }),
    ]);

    expect(userAExercise?.title).toBe("Visible Bench");
    expect(userBExercise?.title).toBe("Hidden Bench");
  });

  it("lists sessions only for the requested owned exercise", async () => {
    const result = await getWeightliftingSessionsPage({
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
    const session = await getWeightliftingSessionById({
      userId: userAId,
      sessionId: userBSessionId,
    });

    expect(session).toBeNull();
  });

  it("returns the latest owned session for an exercise", async () => {
    const session = await getLatestWeightliftingSession({
      userId: userAId,
      exerciseId: userAExerciseId,
    });

    expect(session?.id).toBe(userASessionId);
    expect(session?.sets).toHaveLength(1);
  });
});
