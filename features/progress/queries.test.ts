import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  getPaceProgressData,
  getWeightliftingProgressData,
} from "./queries";
import { parseChartRangeSearchParams } from "./date-range";

const testRunId = `progress-query-${Date.now()}`;
const userAId = `${testRunId}-user-a`;
const userBId = `${testRunId}-user-b`;
const userALogId = `${testRunId}-log-a`;
const userBLogId = `${testRunId}-log-b`;
const userAWeightliftingExerciseId = `${testRunId}-wl-exercise-a`;
const userBWeightliftingExerciseId = `${testRunId}-wl-exercise-b`;
const userAPaceExerciseId = `${testRunId}-pace-exercise-a`;
const userBPaceExerciseId = `${testRunId}-pace-exercise-b`;

function chartRange(
  searchParams: Parameters<typeof parseChartRangeSearchParams>[0] = {},
) {
  return parseChartRangeSearchParams(searchParams);
}

async function createWeightliftingProgressSession({
  id,
  performedAt,
  totalVolume,
}: {
  id: string;
  performedAt: string;
  totalVolume: string;
}) {
  await prisma.weightliftingSession.create({
    data: {
      id: `${testRunId}-${id}`,
      userId: userAId,
      logId: userALogId,
      exerciseId: userAWeightliftingExerciseId,
      performedAt: new Date(`${performedAt}T00:00:00.000Z`),
      totalVolume,
      junkVolume: "0.00",
      workingVolume: totalVolume,
    },
  });
}

async function createPaceProgressSession({
  id,
  performedAt,
}: {
  id: string;
  performedAt: string;
}) {
  await prisma.paceSession.create({
    data: {
      id: `${testRunId}-${id}`,
      userId: userAId,
      logId: userALogId,
      exerciseId: userAPaceExerciseId,
      performedAt: new Date(`${performedAt}T00:00:00.000Z`),
      hours: 0,
      minutes: 25,
      seconds: 0,
      distance: "5.00",
      pace: "5.000",
      paceMinutes: 5,
      paceSeconds: 0,
      speed: "12.000",
    },
  });
}

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
      chartRange: chartRange(),
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
      chartRange: chartRange(),
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

  it("defaults weightlifting progress to the last 6 months", async () => {
    await createWeightliftingProgressSession({
      id: "older-than-six-months",
      performedAt: "2025-11-16",
      totalVolume: "300.00",
    });

    const data = await getWeightliftingProgressData({
      chartRange: chartRange(),
      userId: userAId,
      exerciseId: userAWeightliftingExerciseId,
    });

    expect(data.map((point) => point.id)).toEqual([
      `${testRunId}-wl-session-a`,
    ]);
  });

  it("filters weightlifting progress by preset chart ranges", async () => {
    await Promise.all([
      createWeightliftingProgressSession({
        id: "before-last-year",
        performedAt: "2025-05-16",
        totalVolume: "10.00",
      }),
      createWeightliftingProgressSession({
        id: "last-year-start",
        performedAt: "2025-05-17",
        totalVolume: "20.00",
      }),
      createWeightliftingProgressSession({
        id: "before-ytd",
        performedAt: "2025-12-31",
        totalVolume: "30.00",
      }),
      createWeightliftingProgressSession({
        id: "ytd-start",
        performedAt: "2026-01-01",
        totalVolume: "40.00",
      }),
      createWeightliftingProgressSession({
        id: "twelve-weeks-start",
        performedAt: "2026-02-22",
        totalVolume: "50.00",
      }),
      createWeightliftingProgressSession({
        id: "eight-weeks-start",
        performedAt: "2026-03-22",
        totalVolume: "60.00",
      }),
      createWeightliftingProgressSession({
        id: "four-weeks-start",
        performedAt: "2026-04-19",
        totalVolume: "70.00",
      }),
    ]);

    const fourWeeks = await getWeightliftingProgressData({
      chartRange: chartRange({ chartRange: "4w" }),
      userId: userAId,
      exerciseId: userAWeightliftingExerciseId,
    });
    const eightWeeks = await getWeightliftingProgressData({
      chartRange: chartRange({ chartRange: "8w" }),
      userId: userAId,
      exerciseId: userAWeightliftingExerciseId,
    });
    const twelveWeeks = await getWeightliftingProgressData({
      chartRange: chartRange({ chartRange: "12w" }),
      userId: userAId,
      exerciseId: userAWeightliftingExerciseId,
    });
    const lastYear = await getWeightliftingProgressData({
      chartRange: chartRange({ chartRange: "1y" }),
      userId: userAId,
      exerciseId: userAWeightliftingExerciseId,
    });
    const ytd = await getWeightliftingProgressData({
      chartRange: chartRange({ chartRange: "ytd" }),
      userId: userAId,
      exerciseId: userAWeightliftingExerciseId,
    });

    expect(fourWeeks.map((point) => point.date)).toEqual([
      "2026-04-19",
      "2026-05-17",
    ]);
    expect(eightWeeks.map((point) => point.date)).toEqual([
      "2026-03-22",
      "2026-04-19",
      "2026-05-17",
    ]);
    expect(twelveWeeks.map((point) => point.date)).toEqual([
      "2026-02-22",
      "2026-03-22",
      "2026-04-19",
      "2026-05-17",
    ]);
    expect(lastYear.map((point) => point.date)).toEqual([
      "2025-05-17",
      "2025-12-31",
      "2026-01-01",
      "2026-02-22",
      "2026-03-22",
      "2026-04-19",
      "2026-05-17",
    ]);
    expect(ytd.map((point) => point.date)).toEqual([
      "2026-01-01",
      "2026-02-22",
      "2026-03-22",
      "2026-04-19",
      "2026-05-17",
    ]);
  });

  it("filters weightlifting progress by custom date range", async () => {
    await Promise.all([
      createWeightliftingProgressSession({
        id: "custom-start",
        performedAt: "2026-04-01",
        totalVolume: "300.00",
      }),
      createWeightliftingProgressSession({
        id: "custom-end",
        performedAt: "2026-04-15",
        totalVolume: "400.00",
      }),
    ]);

    const data = await getWeightliftingProgressData({
      chartRange: chartRange({
        chartFrom: "2026-04-01",
        chartRange: "custom",
        chartTo: "2026-04-15",
      }),
      userId: userAId,
      exerciseId: userAWeightliftingExerciseId,
    });

    expect(data.map((point) => point.date)).toEqual([
      "2026-04-01",
      "2026-04-15",
    ]);
  });

  it("falls back to default range for invalid custom filters", async () => {
    await createWeightliftingProgressSession({
      id: "invalid-custom-excluded",
      performedAt: "2025-11-16",
      totalVolume: "300.00",
    });

    const data = await getWeightliftingProgressData({
      chartRange: chartRange({
        chartFrom: "2025-01-01",
        chartRange: "custom",
      }),
      userId: userAId,
      exerciseId: userAWeightliftingExerciseId,
    });

    expect(data.map((point) => point.id)).toEqual([
      `${testRunId}-wl-session-a`,
    ]);
  });

  it("filters pace progress by chart range", async () => {
    await createPaceProgressSession({
      id: "pace-before-four-weeks",
      performedAt: "2026-04-18",
    });

    const data = await getPaceProgressData({
      chartRange: chartRange({ chartRange: "4w" }),
      userId: userAId,
      exerciseId: userAPaceExerciseId,
    });

    expect(data.map((point) => point.id)).toEqual([
      `${testRunId}-pace-session-a`,
    ]);
  });
});
