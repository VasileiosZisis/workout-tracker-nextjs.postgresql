import { SessionKind } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { vi } from "vitest";
import { createPaceSessionAction } from "./actions";

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

const testRunId = `pace-action-${Date.now()}`;
const userId = `${testRunId}-user`;
const logId = `${testRunId}-log`;
const exerciseId = `${testRunId}-exercise`;

describe("pace actions", () => {
  beforeEach(async () => {
    vi.mocked(requireUser).mockResolvedValue({
      id: userId,
      role: "USER",
    });

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: "Pace Action User",
      },
    });

    await prisma.log.create({
      data: {
        id: logId,
        userId,
        title: "Running Log",
        slug: "running-log",
      },
    });

    await prisma.exercise.create({
      data: {
        id: exerciseId,
        userId,
        logId,
        title: "Tempo Run",
        slug: "tempo-run",
        sessionKind: SessionKind.PACE,
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

  it("stores metrics recalculated from inputs instead of submitted metric values", async () => {
    const formData = new FormData();
    formData.set("exerciseId", exerciseId);
    formData.set("performedDate", "2026-05-17");
    formData.set("hours", "0");
    formData.set("minutes", "25");
    formData.set("seconds", "0");
    formData.set("distance", "5");
    formData.set("pace", "999999");
    formData.set("speed", "999999");

    await expect(createPaceSessionAction({}, formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    const session = await prisma.paceSession.findFirstOrThrow({
      where: {
        userId,
        exerciseId,
      },
    });

    expect(Number(session.distance)).toBe(5);
    expect(Number(session.pace)).toBe(5);
    expect(session.paceMinutes).toBe(5);
    expect(session.paceSeconds).toBe(0);
    expect(Number(session.speed)).toBe(12);
    expect(redirect).toHaveBeenCalledWith(
      `/logs/running-log/exercises/tempo-run/pace/${session.id}`,
    );
  });
});
