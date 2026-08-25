import { SessionKind } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { vi } from "vitest";
import {
  createIntervalSessionAction,
  deleteIntervalSessionAction,
  updateIntervalSessionAction,
} from "./actions";

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

const testRunId = `interval-action-${Date.now()}`;
const userId = `${testRunId}-user`;
const foreignUserId = `${testRunId}-foreign-user`;
const logId = `${testRunId}-log`;
const foreignLogId = `${testRunId}-foreign-log`;
const exerciseId = `${testRunId}-exercise`;
const wrongKindExerciseId = `${testRunId}-pace-exercise`;
const foreignExerciseId = `${testRunId}-foreign-exercise`;

function validFormData({
  targetExerciseId = exerciseId,
  sessionId,
  includeFinalRecovery = false,
}: {
  targetExerciseId?: string;
  sessionId?: string;
  includeFinalRecovery?: boolean;
} = {}) {
  const formData = new FormData();
  formData.set("exerciseId", targetExerciseId);
  if (sessionId) {
    formData.set("sessionId", sessionId);
  }
  formData.set("performedDate", "2026-05-17");
  formData.set("rounds", "10");
  formData.set("workMinutes", "0");
  formData.set("workSecondsPart", "30");
  formData.set("recoveryMinutes", "1");
  formData.set("recoverySecondsPart", "0");
  if (includeFinalRecovery) {
    formData.set("includeFinalRecovery", "on");
  }

  formData.set("workSeconds", "999999");
  formData.set("recoverySeconds", "999999");
  formData.set("totalWorkSeconds", "999999");
  formData.set("totalRecoverySeconds", "999999");
  formData.set("intervalBlockSeconds", "999999");
  formData.set("workRestRatio", "999999:1");

  return formData;
}

async function createStoredSession({
  id,
  ownerId = userId,
  ownerLogId = logId,
  ownerExerciseId = exerciseId,
}: {
  id: string;
  ownerId?: string;
  ownerLogId?: string;
  ownerExerciseId?: string;
}) {
  return prisma.intervalSession.create({
    data: {
      id,
      userId: ownerId,
      logId: ownerLogId,
      exerciseId: ownerExerciseId,
      performedAt: new Date("2026-05-16T00:00:00.000Z"),
      rounds: 4,
      workSeconds: 20,
      recoverySeconds: 40,
      includeFinalRecovery: false,
      totalWorkSeconds: 80,
      totalRecoverySeconds: 120,
      intervalBlockSeconds: 200,
    },
  });
}

describe("interval actions", () => {
  beforeEach(async () => {
    vi.mocked(requireUser).mockResolvedValue({
      id: userId,
      role: "USER",
      isDemo: false,
      demoExpiresAt: null,
    });

    await prisma.user.createMany({
      data: [
        {
          id: userId,
          email: `${userId}@example.test`,
          name: "Interval Action User",
        },
        {
          id: foreignUserId,
          email: `${foreignUserId}@example.test`,
          name: "Foreign Interval User",
        },
      ],
    });

    await prisma.log.createMany({
      data: [
        {
          id: logId,
          userId,
          title: "Running Log",
          slug: "running-log",
        },
        {
          id: foreignLogId,
          userId: foreignUserId,
          title: "Foreign Running Log",
          slug: "foreign-running-log",
        },
      ],
    });

    await prisma.exercise.createMany({
      data: [
        {
          id: exerciseId,
          userId,
          logId,
          title: "Track Sprints",
          slug: "track-sprints",
          sessionKind: SessionKind.INTERVAL,
        },
        {
          id: wrongKindExerciseId,
          userId,
          logId,
          title: "Tempo Run",
          slug: "tempo-run",
          sessionKind: SessionKind.PACE,
        },
        {
          id: foreignExerciseId,
          userId: foreignUserId,
          logId: foreignLogId,
          title: "Foreign Sprints",
          slug: "foreign-sprints",
          sessionKind: SessionKind.INTERVAL,
        },
      ],
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await prisma.user.deleteMany({
      where: { id: { in: [userId, foreignUserId] } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates server-calculated metrics and ignores forged derived fields", async () => {
    await expect(
      createIntervalSessionAction({}, validFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    const session = await prisma.intervalSession.findFirstOrThrow({
      where: { userId, exerciseId },
    });

    expect(session).toMatchObject({
      rounds: 10,
      workSeconds: 30,
      recoverySeconds: 60,
      includeFinalRecovery: false,
      totalWorkSeconds: 300,
      totalRecoverySeconds: 540,
      intervalBlockSeconds: 840,
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      "/logs/running-log/exercises/track-sprints",
    );
    expect(redirect).toHaveBeenCalledWith(
      `/logs/running-log/exercises/track-sprints/interval/${session.id}`,
    );
  });

  it("includes the final recovery only when the checkbox is present", async () => {
    await expect(
      createIntervalSessionAction(
        {},
        validFormData({ includeFinalRecovery: true }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    const session = await prisma.intervalSession.findFirstOrThrow({
      where: { userId, exerciseId },
    });

    expect(session).toMatchObject({
      includeFinalRecovery: true,
      totalWorkSeconds: 300,
      totalRecoverySeconds: 600,
      intervalBlockSeconds: 900,
    });
  });

  it("returns validation errors without writing, redirecting, or revalidating", async () => {
    const formData = validFormData();
    formData.set("recoveryMinutes", "0");
    formData.set("recoverySecondsPart", "0");

    const result = await createIntervalSessionAction({}, formData);

    expect(result.fieldErrors?.recoverySecondsPart).toEqual([
      "Recovery duration must be at least 1 second.",
    ]);
    expect(await prisma.intervalSession.count({ where: { userId } })).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["foreign-owned", foreignExerciseId],
    ["wrong-kind", wrongKindExerciseId],
  ])("rejects a %s create target", async (_label, targetExerciseId) => {
    await expect(
      createIntervalSessionAction(
        {},
        validFormData({ targetExerciseId }),
      ),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(
      await prisma.intervalSession.count({
        where: { userId: { in: [userId, foreignUserId] } },
      }),
    ).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("recalculates every derived value on update", async () => {
    const sessionId = `${testRunId}-update-session`;
    await createStoredSession({ id: sessionId });

    await expect(
      updateIntervalSessionAction(
        {},
        validFormData({ sessionId, includeFinalRecovery: true }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    const session = await prisma.intervalSession.findUniqueOrThrow({
      where: { id: sessionId },
    });

    expect(session).toMatchObject({
      rounds: 10,
      workSeconds: 30,
      recoverySeconds: 60,
      includeFinalRecovery: true,
      totalWorkSeconds: 300,
      totalRecoverySeconds: 600,
      intervalBlockSeconds: 900,
    });
    expect(revalidatePath).toHaveBeenCalledTimes(3);
    expect(redirect).toHaveBeenCalledWith(
      `/logs/running-log/exercises/track-sprints/interval/${sessionId}`,
    );
  });

  it("does not update when edited values fail validation", async () => {
    const sessionId = `${testRunId}-invalid-update-session`;
    await createStoredSession({ id: sessionId });
    const formData = validFormData({ sessionId });
    formData.set("rounds", "1");

    const result = await updateIntervalSessionAction({}, formData);
    const unchanged = await prisma.intervalSession.findUniqueOrThrow({
      where: { id: sessionId },
    });

    expect(result.fieldErrors?.rounds).toEqual([
      "Rounds must be at least 2.",
    ]);
    expect(unchanged.rounds).toBe(4);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["foreign-owned", foreignUserId, foreignLogId, foreignExerciseId],
    ["wrong-kind", userId, logId, wrongKindExerciseId],
  ])(
    "rejects a %s update target",
    async (_label, ownerId, ownerLogId, ownerExerciseId) => {
      const sessionId = `${testRunId}-rejected-update-${_label}`;
      await createStoredSession({
        id: sessionId,
        ownerId,
        ownerLogId,
        ownerExerciseId,
      });

      await expect(
        updateIntervalSessionAction({}, validFormData({ sessionId })),
      ).rejects.toThrow("NEXT_NOT_FOUND");

      const unchanged = await prisma.intervalSession.findUniqueOrThrow({
        where: { id: sessionId },
      });
      expect(unchanged.rounds).toBe(4);
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    },
  );

  it("deletes an owned interval session and redirects to its exercise", async () => {
    const sessionId = `${testRunId}-delete-session`;
    await createStoredSession({ id: sessionId });
    const formData = new FormData();
    formData.set("sessionId", sessionId);

    await expect(deleteIntervalSessionAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(
      await prisma.intervalSession.findUnique({ where: { id: sessionId } }),
    ).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith(
      "/logs/running-log/exercises/track-sprints",
    );
    expect(redirect).toHaveBeenCalledWith(
      "/logs/running-log/exercises/track-sprints",
    );
  });

  it.each([
    ["foreign-owned", foreignUserId, foreignLogId, foreignExerciseId],
    ["wrong-kind", userId, logId, wrongKindExerciseId],
  ])(
    "rejects a %s delete target",
    async (_label, ownerId, ownerLogId, ownerExerciseId) => {
      const sessionId = `${testRunId}-rejected-delete-${_label}`;
      await createStoredSession({
        id: sessionId,
        ownerId,
        ownerLogId,
        ownerExerciseId,
      });
      const formData = new FormData();
      formData.set("sessionId", sessionId);

      await expect(deleteIntervalSessionAction(formData)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );

      expect(
        await prisma.intervalSession.findUnique({ where: { id: sessionId } }),
      ).not.toBeNull();
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    },
  );
});
