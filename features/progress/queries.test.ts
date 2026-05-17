import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  getPaceProgressData,
  getWeightliftingProgressData,
} from "./queries";

const testRunId = `progress-query-${Date.now()}`;
const userAId = `${testRunId}-user-a`;
const userBId = `${testRunId}-user-b`;
const userALogId = `${testRunId}-log-a`;
const userBLogId = `${testRunId}-log-b`;
const userAWeightliftingExerciseId = `${testRunId}-wl-exercise-a`;
const userBWeightliftingExerciseId = `${testRunId}-wl-exercise-b`;
const userAPaceExerciseId = `${testRunId}-pace-exercise-a`;
const userBPaceExerciseId = `${testRunId}-pace-exercise-b`;

describe("progress queries", () => {
  beforeEach(async () => {
    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: `${userAId}@example.test`,
          name: "Progress Query User A",
        },
        {
          id: userBId,
          email: `${userBId}@example.test`,
          name: "Progress Query User B",
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
          id: userAWeightliftingExerciseId,
          userId: userAId,
          logId: userALogId,
          title: "Visible Bench",
          slug: "bench-press",
          sessionKind: SessionKind.WEIGHTLIFTING,
        },
        {
          id: userBWeightliftingExerciseId,
          userId: userBId,
          logId: userBLogId,
          title: "Hidden Bench",
          slug: "bench-press",
          sessionKind: SessionKind.WEIGHTLIFTING,
        },
        {
          id: userAPaceExerciseId,
          userId: userAId,
          logId: userALogId,
          title: "Visible Run",
          slug: "tempo-run",
          sessionKind: SessionKind.PACE,
        },
        {
          id: userBPaceExerciseId,
          userId: userBId,
          logId: userBLogId,
          title: "Hidden Run",
          slug: "tempo-run",
          sessionKind: SessionKind.PACE,
        },
      ],
    });

    await prisma.weightliftingSession.createMany({
      data: [
        {
          id: `${testRunId}-wl-session-a`,
          userId: userAId,
          logId: userALogId,
          exerciseId: userAWeightliftingExerciseId,
          performedAt: new Date("2026-05-17T00:00:00.000Z"),
          totalVolume: "100.00",
          junkVolume: "40.00",
          workingVolume: "60.00",
        },
        {
          id: `${testRunId}-wl-session-b`,
          userId: userBId,
          logId: userBLogId,
          exerciseId: userBWeightliftingExerciseId,
          performedAt: new Date("2026-05-18T00:00:00.000Z"),
          totalVolume: "200.00",
          junkVolume: "0.00",
          workingVolume: "200.00",
        },
      ],
    });

    await prisma.paceSession.createMany({
      data: [
        {
          id: `${testRunId}-pace-session-a`,
          userId: userAId,
          logId: userALogId,
          exerciseId: userAPaceExerciseId,
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
          id: `${testRunId}-pace-session-b`,
          userId: userBId,
          logId: userBLogId,
          exerciseId: userBPaceExerciseId,
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

  it("returns only owned weightlifting progress points", async () => {
    const data = await getWeightliftingProgressData({
      userId: userAId,
      exerciseId: userAWeightliftingExerciseId,
    });

    expect(data).toEqual([
      {
        id: `${testRunId}-wl-session-a`,
        date: "2026-05-17",
        totalVolume: 100,
        workingVolume: 60,
        junkVolume: 40,
      },
    ]);
  });

  it("returns only owned pace progress points", async () => {
    const data = await getPaceProgressData({
      userId: userAId,
      exerciseId: userAPaceExerciseId,
    });

    expect(data).toEqual([
      {
        id: `${testRunId}-pace-session-a`,
        date: "2026-05-17",
        distance: 5,
        pace: 5,
        speed: 12,
      },
    ]);
  });
});
