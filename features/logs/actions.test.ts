import { SessionKind } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { vi } from "vitest";
import { deleteLogAction } from "./actions";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const testRunId = `delete-log-action-${Date.now()}`;
const userId = `${testRunId}-user`;
const logId = `${testRunId}-log`;
const weightliftingExerciseId = `${testRunId}-weightlifting-exercise`;
const paceExerciseId = `${testRunId}-pace-exercise`;
const weightliftingSessionId = `${testRunId}-weightlifting-session`;
const paceSessionId = `${testRunId}-pace-session`;

describe("deleteLogAction", () => {
  beforeEach(async () => {
    vi.mocked(requireUser).mockResolvedValue({
      id: userId,
      role: "USER",
    });

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: "Delete Log Action User",
      },
    });

    await prisma.log.create({
      data: {
        id: logId,
        userId,
        title: "Delete Me",
        slug: "delete-me",
      },
    });

    await prisma.exercise.createMany({
      data: [
        {
          id: weightliftingExerciseId,
          userId,
          logId,
          title: "Bench Press",
          slug: "bench-press",
          sessionKind: SessionKind.WEIGHTLIFTING,
        },
        {
          id: paceExerciseId,
          userId,
          logId,
          title: "Tempo Run",
          slug: "tempo-run",
          sessionKind: SessionKind.PACE,
        },
      ],
    });

    await prisma.weightliftingSession.create({
      data: {
        id: weightliftingSessionId,
        userId,
        logId,
        exerciseId: weightliftingExerciseId,
        performedAt: new Date("2026-05-17T00:00:00.000Z"),
        totalVolume: "100.00",
        junkVolume: "0.00",
        workingVolume: "100.00",
        sets: {
          create: {
            position: 1,
            repetitions: "1.00",
            kilograms: "100.00",
            isHard: true,
            volume: "100.00",
          },
        },
      },
    });

    await prisma.paceSession.create({
      data: {
        id: paceSessionId,
        userId,
        logId,
        exerciseId: paceExerciseId,
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
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();

    await prisma.user.deleteMany({
      where: { id: userId },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deletes exercises and all session records for the owned log", async () => {
    const formData = new FormData();
    formData.set("logId", logId);

    await expect(deleteLogAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    const [
      logCount,
      exerciseCount,
      weightliftingSessionCount,
      weightliftingSetCount,
      paceSessionCount,
    ] = await Promise.all([
      prisma.log.count({ where: { id: logId } }),
      prisma.exercise.count({ where: { logId } }),
      prisma.weightliftingSession.count({ where: { logId } }),
      prisma.weightliftingSet.count({
        where: { sessionId: weightliftingSessionId },
      }),
      prisma.paceSession.count({ where: { logId } }),
    ]);

    expect(logCount).toBe(0);
    expect(exerciseCount).toBe(0);
    expect(weightliftingSessionCount).toBe(0);
    expect(weightliftingSetCount).toBe(0);
    expect(paceSessionCount).toBe(0);
    expect(redirect).toHaveBeenCalledWith("/logs");
  });
});
