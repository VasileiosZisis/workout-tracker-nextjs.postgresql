import { vi } from "vitest";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createHistoricalWorkout, reassignWorkoutSession } from "./history";
import { groupHistoricalWorkoutAction, reassignWorkoutAction } from "./history-actions";
import { WorkoutError } from "./service";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { log: { findFirst: vi.fn() } } }));
vi.mock("@/features/workouts/history", () => ({ createHistoricalWorkout: vi.fn(), reassignWorkoutSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }) }));

function form() {
  const data = new FormData(); data.set("logId", "owned-log"); data.set("routineId", "routine");
  data.set("sessionId", "session"); data.set("targetEntryId", "target"); data.set("expectedEntryId", "source");
  data.set("expectedUpdatedAt", "2026-11-02T00:00:00.000Z");
  data.set("definitionId", "definition"); data.set("revision", "3"); data.set("performedDate", "2026-11-01"); data.set("requestId", "request");
  data.append("sessionIds", "one"); data.append("sessionIds", "two");
  return data;
}

describe("history actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: "user-a", role: "USER", isDemo: false, demoExpiresAt: null });
    // These mocks expose only the fields the action consumes; service behavior
    // and database contracts are exercised separately by history.test.ts.
    vi.mocked(prisma.log.findFirst).mockResolvedValue({ slug: "strength" } as Awaited<ReturnType<typeof prisma.log.findFirst>>);
    vi.mocked(createHistoricalWorkout).mockResolvedValue({ id: "created-entry", slug: "push-2026-11-01" } as Awaited<ReturnType<typeof createHistoricalWorkout>>);
    vi.mocked(reassignWorkoutSession).mockResolvedValue({ id: "session", exercise: { slug: "squat" } } as Awaited<ReturnType<typeof reassignWorkoutSession>>);
  });

  it("groups only through the authenticated log and redirects to the resulting entry", async () => {
    await expect(groupHistoricalWorkoutAction({}, form())).rejects.toThrow("NEXT_REDIRECT:/logs/strength/workouts/push-2026-11-01");
    expect(prisma.log.findFirst).toHaveBeenCalledWith({ where: { id: "owned-log", userId: "user-a" }, select: { slug: true } });
    expect(createHistoricalWorkout).toHaveBeenCalledWith("user-a", "owned-log", expect.objectContaining({ sessionIds: ["one", "two"], definitionId: "definition" }));
    expect(revalidatePath).toHaveBeenCalledWith("/logs/strength", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/routine/strength");
  });

  it("passes expected association/version to correction and uses the resolved exercise path", async () => {
    await expect(reassignWorkoutAction({}, form())).rejects.toThrow("NEXT_REDIRECT:/logs/strength/exercises/squat/weightlifting/session");
    expect(reassignWorkoutSession).toHaveBeenCalledWith("user-a", "owned-log", expect.objectContaining({ expectedEntryId: "source", expectedUpdatedAt: "2026-11-02T00:00:00.000Z", targetEntryId: "target" }));
    expect(revalidatePath).toHaveBeenCalledWith("/logs/strength", "layout");
  });

  it("rejects foreign logs before either mutation", async () => {
    vi.mocked(prisma.log.findFirst).mockResolvedValue(null);
    expect((await groupHistoricalWorkoutAction({}, form())).error).toBe("Log not found.");
    expect((await reassignWorkoutAction({}, form())).error).toBe("Log not found.");
    expect(createHistoricalWorkout).not.toHaveBeenCalled(); expect(reassignWorkoutSession).not.toHaveBeenCalled();
  });

  it("returns recoverable errors without revalidation", async () => {
    vi.mocked(createHistoricalWorkout).mockRejectedValue(new WorkoutError("Session list changed."));
    vi.mocked(reassignWorkoutSession).mockRejectedValue(new WorkoutError("Session changed."));
    expect((await groupHistoricalWorkoutAction({}, form())).error).toBe("Session list changed.");
    expect((await reassignWorkoutAction({}, form())).error).toBe("Session changed.");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
