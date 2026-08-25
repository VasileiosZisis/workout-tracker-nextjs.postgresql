import { SessionKind } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { vi } from "vitest";
import { updateExerciseAction } from "./actions";

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

const testRunId = `exercise-action-${Date.now()}`;
const userId = `${testRunId}-user`;
const logId = `${testRunId}-log`;
const exerciseId = `${testRunId}-exercise`;

function updateFormData({
  sessionKind,
  title = "Bench Press",
}: {
  sessionKind: SessionKind;
  title?: string;
}) {
  const formData = new FormData();
  formData.set("exerciseId", exerciseId);
  formData.set("title", title);
  formData.set("sessionKind", sessionKind);
  return formData;
}

describe("exercise actions", () => {
  beforeEach(async () => {
    vi.mocked(requireUser).mockResolvedValue({
      id: userId,
      role: "USER",
      isDemo: false,
      demoExpiresAt: null,
    });

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: "Exercise Action User",
      },
    });

    await prisma.log.create({
      data: {
        id: logId,
        userId,
        title: "Training Log",
        slug: "training-log",
      },
    });

    await prisma.exercise.create({
      data: {
        id: exerciseId,
        userId,
        logId,
        title: "Bench Press",
        slug: "bench-press",
        sessionKind: SessionKind.WEIGHTLIFTING,
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

  it("allows an empty exercise to cycle through every session kind", async () => {
    await expect(
      updateExerciseAction(
        {},
        updateFormData({ sessionKind: SessionKind.INTERVAL }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(
      (
        await prisma.exercise.findUniqueOrThrow({
          where: { id: exerciseId },
        })
      ).sessionKind,
    ).toBe(SessionKind.INTERVAL);

    vi.clearAllMocks();

    await expect(
      updateExerciseAction(
        {},
        updateFormData({ sessionKind: SessionKind.PACE }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(
      (
        await prisma.exercise.findUniqueOrThrow({
          where: { id: exerciseId },
        })
      ).sessionKind,
    ).toBe(SessionKind.PACE);

    vi.clearAllMocks();

    await expect(
      updateExerciseAction(
        {},
        updateFormData({ sessionKind: SessionKind.WEIGHTLIFTING }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(
      (
        await prisma.exercise.findUniqueOrThrow({
          where: { id: exerciseId },
        })
      ).sessionKind,
    ).toBe(SessionKind.WEIGHTLIFTING);
  });

  it("rejects a crafted kind change after a weightlifting session exists", async () => {
    await prisma.weightliftingSession.create({
      data: {
        userId,
        logId,
        exerciseId,
        performedAt: new Date("2026-08-19T00:00:00.000Z"),
      },
    });

    const state = await updateExerciseAction(
      {},
      updateFormData({
        sessionKind: SessionKind.PACE,
        title: "Changed title",
      }),
    );

    expect(state.fieldErrors?.sessionKind).toEqual([
      "Session type cannot be changed after sessions have been added.",
    ]);
    expect(
      await prisma.exercise.findUniqueOrThrow({ where: { id: exerciseId } }),
    ).toMatchObject({
      title: "Bench Press",
      sessionKind: SessionKind.WEIGHTLIFTING,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("rejects a crafted kind change after a pace session exists", async () => {
    await prisma.exercise.update({
      where: { id: exerciseId },
      data: { sessionKind: SessionKind.PACE },
    });
    await prisma.paceSession.create({
      data: {
        userId,
        logId,
        exerciseId,
        performedAt: new Date("2026-08-19T00:00:00.000Z"),
      },
    });

    const state = await updateExerciseAction(
      {},
      updateFormData({ sessionKind: SessionKind.WEIGHTLIFTING }),
    );

    expect(state.fieldErrors?.sessionKind).toEqual([
      "Session type cannot be changed after sessions have been added.",
    ]);
    expect(
      await prisma.exercise.findUniqueOrThrow({ where: { id: exerciseId } }),
    ).toMatchObject({
      title: "Bench Press",
      sessionKind: SessionKind.PACE,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("rejects a crafted kind change after an interval session exists", async () => {
    await prisma.exercise.update({
      where: { id: exerciseId },
      data: { sessionKind: SessionKind.INTERVAL },
    });
    await prisma.intervalSession.create({
      data: {
        userId,
        logId,
        exerciseId,
        performedAt: new Date("2026-08-19T00:00:00.000Z"),
        rounds: 10,
        workSeconds: 30,
        recoverySeconds: 60,
        totalWorkSeconds: 300,
        totalRecoverySeconds: 540,
        intervalBlockSeconds: 840,
      },
    });

    const state = await updateExerciseAction(
      {},
      updateFormData({ sessionKind: SessionKind.PACE }),
    );

    expect(state.fieldErrors?.sessionKind).toEqual([
      "Session type cannot be changed after sessions have been added.",
    ]);
    expect(
      await prisma.exercise.findUniqueOrThrow({ where: { id: exerciseId } }),
    ).toMatchObject({
      title: "Bench Press",
      sessionKind: SessionKind.INTERVAL,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("allows title changes when the submitted session kind is unchanged", async () => {
    await prisma.weightliftingSession.create({
      data: {
        userId,
        logId,
        exerciseId,
        performedAt: new Date("2026-08-19T00:00:00.000Z"),
      },
    });

    await expect(
      updateExerciseAction(
        {},
        updateFormData({
          sessionKind: SessionKind.WEIGHTLIFTING,
          title: "Incline Press",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(
      await prisma.exercise.findUniqueOrThrow({ where: { id: exerciseId } }),
    ).toMatchObject({
      title: "Incline Press",
      slug: "incline-press",
      sessionKind: SessionKind.WEIGHTLIFTING,
    });
  });
});
