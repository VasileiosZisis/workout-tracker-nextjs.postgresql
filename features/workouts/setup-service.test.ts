import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createRoutineFromSetup, saveWorkoutAssignments } from "./setup-service";
import { createRoutineSetupAction, saveWorkoutAssignmentsAction, searchRoutineExercisesAction, validateRoutineExercisesAction } from "./setup-actions";
import { getWorkoutPanel } from "./queries";
import { endEntry, lockWorkoutContext, startEntry } from "./service";
import { getScheduleContext } from "./schedule-queries";

const fault = vi.hoisted(() => ({ receipt: false, collision: false, assignment: false }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", async (importOriginal) => {
  const { prisma: base } = await importOriginal<typeof import("@/lib/db")>();
  return { prisma: base.$extends({ query: {
    workoutScheduleRequest: { create({ args, query }) { if (fault.receipt) { fault.receipt = false; throw new Error("SETUP_LATE_FAILURE"); } return query(args); } },
    workoutRoutine: { update({ args, query }) { if (fault.assignment) { fault.assignment = false; throw new Error("ASSIGNMENT_LATE_FAILURE"); } return query(args); } },
    exercise: { create({ args, query }) { if (fault.collision && args.data.title === "Second new") { fault.collision = false; throw Object.assign(new Error("SIMULATED_COLLISION"), { code: "P2002" }); } return query(args); } },
  } }) };
});
vi.setConfig({ testTimeout: 45_000, hookTimeout: 30_000 });
const prefix = `routine-setup-${randomUUID()}`, userId = `${prefix}-user`, logId = `${prefix}-log`, exerciseId = `${prefix}-exercise`, secondId = `${prefix}-second`, demoUser = `${prefix}-demo`, otherLog = `${prefix}-other-log`;
const now = new Date("2026-11-05T12:00:00Z");
function input(style: "CONTINUOUS" | "WEEKLY" | "FIXED" = "CONTINUOUS") {
  return { requestId: randomUUID(), name: "Split", nextId: "b", workouts: [{ id: "a", name: "Push", exerciseIds: [exerciseId] }, { id: "b", name: "Pull", exerciseIds: [exerciseId, secondId] }], newExercises: [] as { id: string; title: string }[], style, timezone: "UTC", weekStart: 1, today: "2026-11-05", assignments: style === "FIXED" ? [{ weekday: 4, definitionId: "b" }] : [] };
}
const panel = async () => (await getWorkoutPanel(userId, logId))!;
async function assignmentInput() {
  const current = await panel();
  return { routineId: current.id, revision: current.revision, definitionId: current.definitions[1].id, expectedScheduleId: current.schedule!.id, expectedToday: current.schedule!.today, exerciseIds: [secondId, exerciseId], newExercises: [] as { id: string; title: string }[] };
}
describe("guided routine setup and assignments", () => {
  beforeEach(async () => {
    fault.receipt = false; fault.collision = false; fault.assignment = false; vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: userId, role: "USER", isDemo: false, demoExpiresAt: null });
    await prisma.user.create({ data: { id: userId } });
    await prisma.user.create({ data: { id: demoUser, demoExpiresAt: new Date(Date.now() + 3600000) } });
    await prisma.log.createMany({ data: [{ id: logId, userId, title: "Strength", slug: "strength" }, { id: otherLog, userId, title: "Other", slug: "other" }, { id: `${prefix}-demo-log`, userId: demoUser, title: "Demo", slug: "demo" }] });
    await prisma.exercise.createMany({ data: [{ id: exerciseId, userId, logId, title: "Bench press", slug: "bench", sessionKind: "WEIGHTLIFTING" }, { id: secondId, userId, logId, title: "Row", slug: "row", sessionKind: "WEIGHTLIFTING" }, { id: `${prefix}-pace`, userId, logId, title: "Run", slug: "run", sessionKind: "PACE" }, { id: `${prefix}-foreign`, userId: demoUser, logId: `${prefix}-demo-log`, title: "Foreign", slug: "foreign", sessionKind: "WEIGHTLIFTING" }, { id: `${prefix}-cross-log`, userId, logId: otherLog, title: "Other", slug: "other", sessionKind: "WEIGHTLIFTING" }] });
  });
  afterEach(async () => { await prisma.user.deleteMany({ where: { id: { in: [userId, demoUser] } } }); });
  afterAll(async () => { await prisma.$disconnect(); });

  it.each(["CONTINUOUS", "WEEKLY", "FIXED"] as const)("creates %s with assignments and the initial pointer atomically", async (style) => {
    const payload = input(style); await createRoutineFromSetup(userId, logId, payload, now);
    const current = await panel();
    expect(current.definitions.map((item) => item.exercises.map((link) => link.exercise.id))).toEqual([[exerciseId], [exerciseId, secondId]]);
    expect(current.nextId).toBe(current.definitions[1].id);
    expect((await getScheduleContext(userId, logId, now))!.style).toBe(style);
    expect(await prisma.weightliftingSession.count({ where: { logId } })).toBe(0);
  });
  it("creates a shared inline exercise only once and preserves retained assignment IDs on reorder", async () => {
    const payload = input(), inline = `new:${randomUUID()}`;
    payload.newExercises = [{ id: inline, title: "New lift" }]; payload.workouts[0].exerciseIds.push(inline); payload.workouts[1].exerciseIds.push(inline);
    await createRoutineFromSetup(userId, logId, payload, now);
    expect(await prisma.exercise.count({ where: { logId, title: "New lift" } })).toBe(1);
    const before = await panel(), links = before.definitions[1].exercises;
    const current = await assignmentInput();
    current.exerciseIds = links.map((item) => item.exercise.id).reverse();
    await saveWorkoutAssignments(userId, logId, current);
    const after = await panel();
    expect(after.definitions[1].exercises.map((item) => item.id)).toEqual(links.map((item) => item.id).reverse());
    expect(after.nextId).toBe(before.nextId);
    expect(await prisma.workoutSchedule.count({ where: { routineId: before.id } })).toBe(1);
  });
  it("returns identical/concurrent retries without overwriting later edits and rejects changed-input replays", async () => {
    const payload = input();
    const [first, retry] = await Promise.all([createRoutineFromSetup(userId, logId, payload, now), createRoutineFromSetup(userId, logId, payload, now)]);
    expect(first).toEqual(retry);
    const edit = await assignmentInput(); await saveWorkoutAssignments(userId, logId, edit);
    expect(await createRoutineFromSetup(userId, logId, payload, now)).toEqual(first);
    expect((await panel()).definitions[1].exercises.map((item) => item.exercise.id)).toEqual([secondId, exerciseId]);
    await expect(createRoutineFromSetup(userId, logId, { ...payload, name: "Changed" }, now)).rejects.toThrow("different inputs");
    await expect(createRoutineFromSetup(userId, logId, { ...payload, requestId: randomUUID() }, now)).rejects.toThrow("already exists");
  });
  it("creates inline exercises through the existing editor atomically and rolls back late failures", async () => {
    await createRoutineFromSetup(userId, logId, input(), now);
    const before = await panel();
    const inline = { id: `new:${randomUUID()}`, title: "Editor lift" };
    const edit = await assignmentInput(); edit.newExercises = [inline]; edit.exerciseIds = [inline.id, exerciseId];
    await saveWorkoutAssignments(userId, logId, edit);
    const created = await prisma.exercise.findFirstOrThrow({ where: { logId, title: inline.title } });
    let current = await panel();
    expect(current.definitions[1].exercises.map((item) => item.exercise.id)).toEqual([created.id, exerciseId]);
    expect(current.revision).toBe(before.revision + 1); expect(current.nextId).toBe(before.nextId);
    const other = { ...edit, revision: current.revision, definitionId: current.definitions[0].id, exerciseIds: [created.id], newExercises: [] };
    await saveWorkoutAssignments(userId, logId, other);
    expect(await prisma.exercise.count({ where: { logId, title: inline.title } })).toBe(1);
    current = await panel();
    const fail = await assignmentInput(); const draft = { id: `new:${randomUUID()}`, title: "Failed editor lift" };
    fail.newExercises = [draft]; fail.exerciseIds = [draft.id]; fault.assignment = true;
    await expect(saveWorkoutAssignments(userId, logId, fail)).rejects.toThrow("ASSIGNMENT_LATE_FAILURE");
    expect(await prisma.exercise.count({ where: { logId, title: draft.title } })).toBe(0);
    expect((await panel()).revision).toBe(current.revision);
    expect((await panel()).definitions[1].exercises).toEqual(current.definitions[1].exercises);
    expect(await prisma.workoutSchedule.count({ where: { routineId: current.id } })).toBe(1);
  });
  it("rolls back routine, definitions, exercises, schedule, and assignments on a late failure or slug collision", async () => {
    const payload = input(); payload.newExercises = [{ id: `new:${randomUUID()}`, title: "First new" }, { id: `new:${randomUUID()}`, title: "Second new" }]; payload.workouts[0].exerciseIds = payload.newExercises.map((item) => item.id);
    fault.receipt = true;
    await expect(createRoutineFromSetup(userId, logId, payload, now)).rejects.toThrow("SETUP_LATE_FAILURE");
    expect(await prisma.workoutRoutine.count({ where: { logId } })).toBe(0);
    expect(await prisma.workoutDefinition.count({ where: { routine: { logId } } })).toBe(0);
    expect(await prisma.exercise.count({ where: { logId, title: { in: ["First new", "Second new"] } } })).toBe(0);
    fault.collision = true;
    await expect(createRoutineFromSetup(userId, logId, payload, now)).rejects.toThrow("nothing was saved");
    expect(await prisma.workoutRoutine.count({ where: { logId } })).toBe(0);
    expect(await prisma.exercise.count({ where: { logId, title: "First new" } })).toBe(0);
  });
  it.each([`${prefix}-foreign`, `${prefix}-cross-log`, `${prefix}-pace`, "deleted-exercise"])("rejects unavailable exercise %s without writes", async (id) => {
    const payload = input(); payload.workouts[0].exerciseIds = [id];
    await expect(createRoutineFromSetup(userId, logId, payload, now)).rejects.toThrow("unavailable");
    expect(await prisma.workoutRoutine.count({ where: { logId } })).toBe(0);
  });
  it("rejects empty/duplicate selections and stale setup date, with no partial inline creation", async () => {
    const payload = input(); payload.workouts[0].exerciseIds = [];
    await expect(createRoutineFromSetup(userId, logId, payload, now)).rejects.toThrow();
    payload.workouts[0].exerciseIds = [exerciseId, exerciseId];
    await expect(createRoutineFromSetup(userId, logId, payload, now)).rejects.toThrow("only once");
    payload.workouts[0].exerciseIds = [exerciseId]; payload.today = "2026-11-04";
    await expect(createRoutineFromSetup(userId, logId, payload, now)).rejects.toThrow("date changed");
    expect(await prisma.workoutRoutine.count({ where: { logId } })).toBe(0);
  });
  it("assignment edits reject stale/foreign/archived/active submissions and preserve schedule progress and training", async () => {
    await createRoutineFromSetup(userId, logId, input("WEEKLY"), now);
    const current = await panel(), context = (await getScheduleContext(userId, logId, now))!;
    const entry = await prisma.$transaction(async (tx) => startEntry(tx, userId, logId, await lockWorkoutContext(tx, userId, logId), { routineId: current.id, revision: current.revision, nextId: current.nextId, requestId: randomUUID(), date: context.today, scheduling: { intent: "SCHEDULED", scheduleId: context.id, slotKey: context.next!.key, definitionId: context.next!.definitionId, today: context.today } }, now));
    const edit = await assignmentInput();
    await expect(saveWorkoutAssignments(userId, logId, edit)).rejects.toThrow("active workout");
    const saved = await prisma.weightliftingSession.create({ data: { userId, logId, exerciseId, workoutEntryId: entry.id, performedAt: entry.performedAt, totalVolume: "500", workingVolume: "500", sets: { create: { position: 1, repetitions: "10", kilograms: "50", volume: "500", isHard: true } } } });
    await endEntry(userId, logId, entry.id, false, now);
    const before = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id }, include: { sets: true } });
    const update = await assignmentInput(); await saveWorkoutAssignments(userId, logId, update);
    await expect(saveWorkoutAssignments(userId, logId, update)).rejects.toThrow("changed");
    expect(await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id }, include: { sets: true } })).toEqual(before);
    expect((await getScheduleContext(userId, logId, now))!.next?.name).toBe("Pull");
    expect(await prisma.workoutSchedule.count({ where: { routineId: current.id } })).toBe(1);
    const latest = await assignmentInput();
    await expect(saveWorkoutAssignments(demoUser, logId, latest)).rejects.toThrow("Log not found");
    await expect(saveWorkoutAssignments(userId, logId, { ...latest, definitionId: "foreign" })).rejects.toThrow("current workout");
    await prisma.workoutDefinition.update({ where: { id: latest.definitionId }, data: { archived: true } });
    await expect(saveWorkoutAssignments(userId, logId, latest)).rejects.toThrow("current workout");
  });
  it("picker search and restored references are paginated, weightlifting-only, and owner scoped", async () => {
    await prisma.exercise.createMany({ data: Array.from({ length: 14 }, (_, index) => ({ userId, logId, title: `Lift ${String(index).padStart(2, "0")}`, slug: `lift-${index}`, sessionKind: "WEIGHTLIFTING" as const })) });
    const first = await searchRoutineExercisesAction({ logId, query: "Lift", page: 1 });
    const second = await searchRoutineExercisesAction({ logId, query: "Lift", page: 2 });
    expect(first.exercises).toHaveLength(12); expect(second.exercises).toHaveLength(2);
    expect(new Set([...first.exercises, ...second.exercises].map((item) => item.id)).size).toBe(14);
    expect((await searchRoutineExercisesAction({ logId: `${prefix}-demo-log`, page: 1 })).exercises).toEqual([]);
    expect((await validateRoutineExercisesAction({ logId, ids: [exerciseId, `${prefix}-foreign`, `${prefix}-pace`] })).map((item) => item.id)).toEqual([exerciseId]);
  });
  it("actions authenticate ownership, reject malformed payloads, and revalidate successful setup", async () => {
    const form = new FormData(); form.set("logId", `${prefix}-demo-log`); form.set("payload", "{}");
    expect((await createRoutineSetupAction({}, form)).error).toBe("Log not found.");
    form.set("logId", logId); form.set("payload", "bad"); expect((await createRoutineSetupAction({}, form)).error).toContain("Reload");
    const payload = input(); payload.today = new Date().toISOString().slice(0, 10); form.set("payload", JSON.stringify(payload));
    expect((await createRoutineSetupAction({}, form)).routineId).toBeDefined();
    expect(revalidatePath).toHaveBeenCalledWith("/logs/strength", "layout"); expect(revalidatePath).toHaveBeenCalledWith("/routine/strength");
    const edit = await assignmentInput(); form.set("payload", JSON.stringify(edit));
    expect((await saveWorkoutAssignmentsAction({}, form)).routineId).toBeDefined();
  });
});
