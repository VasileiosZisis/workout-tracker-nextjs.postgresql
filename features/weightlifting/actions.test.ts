import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createWeightliftingSessionAction,
  updateWeightliftingSessionAction,
} from "./actions";
import { vi } from "vitest";

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

const testRunId = `weightlifting-action-${Date.now()}`;
const userId = `${testRunId}-user`;
const logId = `${testRunId}-log`;
const exerciseId = `${testRunId}-exercise`;

function validFormData() {
  const formData = new FormData();
  formData.set("exerciseId", exerciseId);
  formData.set("performedDate", "2026-05-17");
  formData.set("setCount", "2");
  formData.set("sets.0.repetitions", "10");
  formData.set("sets.0.kilograms", "50");
  formData.set("sets.1.repetitions", "5");
  formData.set("sets.1.kilograms", "100");
  formData.set("sets.1.isHard", "on");
  return formData;
}

describe("weightlifting actions", () => {
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
        name: "Weightlifting Action User",
      },
    });

    await prisma.log.create({
      data: {
        id: logId,
        userId,
        title: "Strength Log",
        slug: "strength-log",
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

  it("stores metrics recalculated from sets instead of submitted totals", async () => {
    const formData = validFormData();
    formData.set("totalVolume", "999999");
    formData.set("workingVolume", "999999");
    formData.set("junkVolume", "999999");

    await expect(createWeightliftingSessionAction({}, formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    const session = await prisma.weightliftingSession.findFirstOrThrow({
      where: {
        userId,
        exerciseId,
      },
      include: {
        sets: {
          orderBy: { position: "asc" },
        },
      },
    });

    expect(Number(session.totalVolume)).toBe(1000);
    expect(Number(session.workingVolume)).toBe(500);
    expect(Number(session.junkVolume)).toBe(500);
    expect(Number(session.sets[0].volume)).toBe(500);
    expect(Number(session.sets[1].volume)).toBe(500);
    expect(redirect).toHaveBeenCalledWith(
      `/logs/strength-log/exercises/bench-press/weightlifting/${session.id}`,
    );
  });

  it("rejects an impossible create date without inserting a session", async () => {
    const formData = validFormData();
    formData.set("performedDate", "2026-02-31");

    const result = await createWeightliftingSessionAction({}, formData);

    expect(result.fieldErrors?.performedDate).toEqual(["Use a valid date."]);
    expect(await prisma.weightliftingSession.count({ where: { userId } })).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("preserves the session and sets when an edited date is impossible", async () => {
    const original = await prisma.weightliftingSession.create({
      data: {
        userId,
        logId,
        exerciseId,
        performedAt: new Date("2026-05-16T00:00:00.000Z"),
        totalVolume: "320.00",
        junkVolume: "320.00",
        workingVolume: "0.00",
        sets: {
          create: {
            position: 1,
            repetitions: "8.00",
            kilograms: "40.00",
            isHard: false,
            volume: "320.00",
          },
        },
      },
      include: { sets: { orderBy: { position: "asc" } } },
    });
    const formData = validFormData();
    formData.set("sessionId", original.id);
    formData.set("performedDate", "2026-02-31");

    const result = await updateWeightliftingSessionAction({}, formData);
    const unchanged = await prisma.weightliftingSession.findUniqueOrThrow({
      where: { id: original.id },
      include: { sets: { orderBy: { position: "asc" } } },
    });

    expect(result.fieldErrors?.performedDate).toEqual(["Use a valid date."]);
    expect(unchanged).toEqual(original);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
