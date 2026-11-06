import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RoutinePage from "@/app/(app)/routine/page";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { startWorkoutFromViewAction, endWorkoutFromViewAction } from "./view-actions";
import { createWorkoutFixture } from "@/tests/fixtures/workout";
import { getWorkoutSummary, getActiveWorkoutDetail, getRoutineNamesForLogs } from "./queries";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }) }));
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });
const prefix = `workout-view-${randomUUID()}`, userId = `${prefix}-user`, logId = `${prefix}-log`, exerciseId = `${prefix}-exercise`;
async function startForm() {
  const routine = (await getWorkoutSummary(userId, logId))!;
  const form = new FormData();
  for (const [key, value] of Object.entries({ logId, routineId: routine.id, revision: String(routine.revision), nextId: routine.nextId, requestId: randomUUID(), performedDate: "2026-10-12", schedulingIntent: "ROTATION", scheduleId: "", slotKey: "", chosenDefinitionId: routine.nextId, scheduleToday: routine.schedule!.today })) form.set(key, value);
  return form;
}
async function start() {
  const form = await startForm();
  await expect(startWorkoutFromViewAction({}, form)).rejects.toThrow(`NEXT_REDIRECT:/logs/strength/workouts/`);
  return prisma.workoutEntry.findUniqueOrThrow({ where: { userId_requestId: { userId, requestId: String(form.get("requestId")) } } });
}
describe("dedicated workout actions and queries", () => {
  beforeEach(async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: userId, role: "USER", isDemo: false, demoExpiresAt: null });
    await prisma.user.create({ data: { id: userId } });
    await prisma.log.create({ data: { id: logId, userId, title: "Strength", slug: "strength" } });
    await prisma.exercise.create({ data: { id: exerciseId, userId, logId, title: "Squat", slug: "squat", sessionKind: "WEIGHTLIFTING" } });
    await createWorkoutFixture(userId, logId, [{ name: "A" }, { name: "B" }]);
  });
  afterEach(async () => { vi.clearAllMocks(); await prisma.user.deleteMany({ where: { id: userId } }); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("shows the routine name for configured logs and setup copy for unconfigured logs", async () => {
    await prisma.workoutRoutine.update({ where: { logId }, data: { name: "Strength split" } });
    await prisma.log.create({ data: { userId, title: "New log", slug: "new-log" } });

    const html = renderToStaticMarkup(await RoutinePage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("<h2>Strength split</h2><p>Strength</p>");
    expect(html).toContain("<h2>New log</h2><p>Configure workout routine</p>");
    expect((await getRoutineNamesForLogs(`${prefix}-other-user`, [logId])).size).toBe(0);
  });

  it("redirects exact Start retries to the same entry and rejects stale distinct requests", async () => {
    const form = await startForm();
    await expect(startWorkoutFromViewAction({}, form)).rejects.toThrow("NEXT_REDIRECT:/logs/strength/workouts/");
    const entry = await prisma.workoutEntry.findFirstOrThrow({ where: { logId } });
    await expect(startWorkoutFromViewAction({}, form)).rejects.toThrow(`NEXT_REDIRECT:/logs/strength/workouts/${entry.slug}`);
    form.set("requestId", randomUUID());
    expect((await startWorkoutFromViewAction({}, form)).error).toContain("changed");
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/logs/strength", "layout");
  });
  it("retains an older active date, rejects empty Finish, and preserves sessions when discarding", async () => {
    const entry = await start();
    const form = new FormData(); form.set("logId", logId); form.set("entryId", entry.id); form.set("operation", "finish");
    expect((await endWorkoutFromViewAction({}, form)).error).toContain("at least one");
    const session = await prisma.weightliftingSession.create({ data: { userId, logId, exerciseId, workoutEntryId: entry.id, performedAt: entry.performedAt, totalVolume: "500", sets: { create: { position: 1, repetitions: "10", kilograms: "50", volume: "500", isHard: true } } } });
    const summary = (await getWorkoutSummary(userId, logId))!;
    expect(summary.active?._count.sessions).toBe(1);
    expect((await getActiveWorkoutDetail(userId, logId, entry.id))!.date).toBe("2026-10-12");
    form.set("operation", "discard");
    expect((await endWorkoutFromViewAction({}, form)).error).toContain("Confirm");
    form.set("confirmed", "yes");
    await expect(endWorkoutFromViewAction({}, form)).rejects.toThrow("NEXT_REDIRECT:/logs/strength");
    await expect(endWorkoutFromViewAction({}, form)).rejects.toThrow("NEXT_REDIRECT:/logs/strength");
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: session.id } })).workoutEntryId).toBeNull();
    expect(await prisma.weightliftingSet.count({ where: { sessionId: session.id } })).toBe(1);
    expect((await getWorkoutSummary(userId, logId))!.nextId).toBe(summary.nextId);
  });
  it("returns a retried Start to the log after its entry was discarded", async () => {
    const form = await startForm();
    await expect(startWorkoutFromViewAction({}, form)).rejects.toThrow("NEXT_REDIRECT:/logs/strength/workouts/");
    const entry = await prisma.workoutEntry.findFirstOrThrow({ where: { logId } });
    const discard = new FormData(); discard.set("logId", logId); discard.set("entryId", entry.id); discard.set("operation", "discard"); discard.set("confirmed", "yes");
    await expect(endWorkoutFromViewAction({}, discard)).rejects.toThrow("NEXT_REDIRECT:/logs/strength");
    await expect(startWorkoutFromViewAction({}, form)).rejects.toThrow("NEXT_REDIRECT:/logs/strength");
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(1);
  });
  it("finishes once, redirects to the log, and scopes reads and writes by owner/log", async () => {
    const entry = await start();
    await prisma.weightliftingSession.create({ data: { userId, logId, exerciseId, workoutEntryId: entry.id, performedAt: entry.performedAt } });
    const form = new FormData(); form.set("logId", logId); form.set("entryId", entry.id); form.set("operation", "finish");
    await expect(endWorkoutFromViewAction({}, form)).rejects.toThrow("NEXT_REDIRECT:/logs/strength");
    const nextId = (await getWorkoutSummary(userId, logId))!.nextId;
    await expect(endWorkoutFromViewAction({}, form)).rejects.toThrow("NEXT_REDIRECT:/logs/strength");
    expect((await getWorkoutSummary(userId, logId))!.nextId).toBe(nextId);
    expect(await getActiveWorkoutDetail(userId, logId, entry.id)).toBeNull();
    expect(await getWorkoutSummary("foreign", logId)).toBeNull();
    expect(await getActiveWorkoutDetail("foreign", logId, entry.id)).toBeNull();
    expect(await getActiveWorkoutDetail(userId, "foreign-log", entry.id)).toBeNull();
    form.set("logId", "foreign-log");
    expect((await endWorkoutFromViewAction({}, form)).error).toBe("Log not found.");
    const startRequest = await startForm(); startRequest.set("logId", "foreign-log");
    expect((await startWorkoutFromViewAction({}, startRequest)).error).toBe("Log not found.");
  });
  it("captures ordered assignments and loads multiple sessions without sets or later routine edits", async () => {
    const routine = (await getWorkoutSummary(userId, logId))!;
    const other = await prisma.exercise.create({ data: { userId, logId, title: "Row", slug: "row", sessionKind: "WEIGHTLIFTING" } });
    await prisma.workoutExercise.create({ data: { definitionId: routine.nextId, exerciseId, position: 1 } });
    await prisma.workoutExercise.create({ data: { definitionId: routine.nextId, exerciseId: other.id, position: 0 } });
    const entry = await start();
    await prisma.weightliftingSession.createMany({ data: [exerciseId, exerciseId, other.id].map((id) => ({ userId, logId, exerciseId: id, workoutEntryId: entry.id, performedAt: entry.performedAt })) });
    let detail = (await getActiveWorkoutDetail(userId, logId, entry.id))!;
    expect(detail.exercises.map((item) => item.exercise.title)).toEqual(["Row", "Squat"]);
    expect(detail.sessions.filter((session) => session.exercise.id === exerciseId)).toHaveLength(2);
    expect(detail.sessions[0]).not.toHaveProperty("sets");
    await prisma.workoutExercise.deleteMany({ where: { definitionId: entry.definitionId, exerciseId: other.id } });
    detail = (await getActiveWorkoutDetail(userId, logId, entry.id))!;
    expect(detail.exercises.map((item) => item.exercise.title)).toEqual(["Row", "Squat"]);
    expect(detail.sessions.some((session) => session.exercise.id === other.id)).toBe(true);
  });
});
