import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { changeEntryExercise, entryExerciseChangeSchema, type EntryExerciseChange } from "./entry-exercises";
import { changeEntryExerciseAction } from "./entry-exercise-actions";
import { endEntry, lockWorkoutContext, startEntry, deleteRoutine } from "./service";
import { createWorkoutFixture } from "@/tests/fixtures/workout";
import { getActiveWorkoutDetail, getWorkoutSelection } from "./queries";
import { createWeightliftingSessionAction } from "@/features/weightlifting/actions";
import { deleteExerciseAction, updateExerciseAction } from "@/features/exercises/actions";
import { getScheduleContext } from "./schedule-queries";
import { saveSchedule } from "./scheduling";

const fault = vi.hoisted(() => ({ receipt: false, capture: false, collision: false }));
vi.mock("@/lib/db", async (importOriginal) => {
  const { prisma: base } = await importOriginal<typeof import("@/lib/db")>();
  return { prisma: base.$extends({ query: {
    workoutScheduleRequest: { create({ args, query }) {
      if (fault.receipt) { fault.receipt = false; throw new Error("ENTRY_PLAN_RECEIPT_FAILURE"); }
      if (fault.collision) { fault.collision = false; throw Object.assign(new Error("REQUEST_COLLISION"), { code: "P2002" }); }
      return query(args);
    } },
    workoutEntryExercise: { createMany({ args, query }) { if (fault.capture) { fault.capture = false; throw new Error("ENTRY_PLAN_CAPTURE_FAILURE"); } return query(args); } },
  } }) };
});
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }), notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.setConfig({ testTimeout: 60_000, hookTimeout: 30_000 });

const prefix = `entry-plan-${randomUUID()}`, userId = `${prefix}-owner`, logId = `${prefix}-log`, demo = `${prefix}-demo`, demoLog = `${prefix}-demo-log`, otherLog = `${prefix}-other-log`;
const ids = [0, 1, 2, 3].map((index) => `${prefix}-exercise-${index}`);
const performedDate = "2026-05-17", now = new Date("2026-11-05T12:00:00Z");
const entry = (entryId: string) => prisma.workoutEntry.findUniqueOrThrow({ where: { id: entryId } });
const detail = (entryId: string) => getActiveWorkoutDetail(userId, logId, entryId);
async function startInput() {
  const current = (await getWorkoutSelection(userId, logId))!;
  return { routineId: current.routineId, revision: current.revision, nextId: current.nextId, date: performedDate, requestId: randomUUID() };
}
async function start(input?: Awaited<ReturnType<typeof startInput>>) {
  const payload = input ?? await startInput();
  return prisma.$transaction(async (tx) => startEntry(tx, userId, logId, await lockWorkoutContext(tx, userId, logId), payload));
}
async function change(entryId: string, exerciseId = ids[2], originalExerciseId?: string): Promise<EntryExerciseChange> {
  return { entryId, expectedRevision: (await entry(entryId)).exercisePlanRevision, requestId: randomUUID(), exerciseId,
    change: originalExerciseId ? { operation: "replace", originalExerciseId } : { operation: "add" } };
}
async function session(entryId: string, exerciseId = ids[0]) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ exerciseId, requestId: randomUUID(), performedDate, workoutSelection: entryId,
    setCount: "1", "sets.0.repetitions": "10", "sets.0.kilograms": "50", "sets.0.isHard": "on" })) form.set(key, value);
  await expect(createWeightliftingSessionAction({}, form)).rejects.toThrow("NEXT_REDIRECT");
  return prisma.weightliftingSession.findUniqueOrThrow({ where: { userId_requestId: { userId, requestId: String(form.get("requestId")) } }, include: { sets: true } });
}
async function legacy(entryId: string) {
  await prisma.workoutEntryExercise.deleteMany({ where: { entryId } });
  await prisma.workoutEntry.update({ where: { id: entryId }, data: { exercisePlanRevision: null } });
}

describe("active workout exercise plans", () => {
  beforeEach(async () => {
    vi.clearAllMocks(); fault.receipt = false; fault.capture = false; fault.collision = false;
    vi.mocked(requireUser).mockResolvedValue({ id: userId, role: "USER", isDemo: false, demoExpiresAt: null });
    await prisma.user.createMany({ data: [{ id: userId }, { id: demo, demoExpiresAt: new Date(Date.now() + 3600000) }] });
    await prisma.log.createMany({ data: [{ id: logId, userId, title: "Strength", slug: "strength" }, { id: otherLog, userId, title: "Other", slug: "other" }, { id: demoLog, userId: demo, title: "Demo", slug: "demo" }] });
    await prisma.exercise.createMany({ data: [
      ...ids.map((id, index) => ({ id, userId, logId, title: `Lift ${index}`, slug: `lift-${index}`, sessionKind: "WEIGHTLIFTING" as const })),
      { id: `${prefix}-pace`, userId, logId, title: "Run", slug: "run", sessionKind: "PACE" },
      { id: `${prefix}-foreign`, userId: demo, logId: demoLog, title: "Foreign", slug: "foreign", sessionKind: "WEIGHTLIFTING" },
      { id: `${prefix}-cross-log`, userId, logId: otherLog, title: "Other", slug: "other", sessionKind: "WEIGHTLIFTING" },
    ] });
    await createWorkoutFixture(userId, logId, [{ name: "A", exerciseIds: ids.slice(0, 2) }]);
  });
  afterEach(async () => { await prisma.user.deleteMany({ where: { id: { in: [userId, demo] } } }); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("captures Start once, appends and replaces in place, and reloads the same older workout", async () => {
    const input = await startInput(), active = await start(input);
    const originalLinks = await prisma.workoutEntryExercise.findMany({ where: { entryId: active.id }, orderBy: { position: "asc" } });
    expect(active.exercisePlanRevision).toBe(0);
    await changeEntryExercise(userId, logId, await change(active.id));
    await changeEntryExercise(userId, logId, await change(active.id, ids[3], ids[0]));
    const saved = (await detail(active.id))!;
    expect(saved.date).toBe(performedDate); expect(saved.exercises.map((item) => item.exercise.id)).toEqual([ids[3], ids[1], ids[2]]);
    expect(saved.exercises[0].id).toBe(originalLinks[0].id);
    expect((await start(input)).id).toBe(active.id);
    expect((await detail(active.id))!.exercises).toEqual(saved.exercises);
  });
  it("preserves recorded sets, associations and metrics and next occurrence uses Routine assignments", async () => {
    const active = await start();
    const recorded = await session(active.id), otherRecorded = await session(active.id, ids[2]);
    const routineBefore = await prisma.workoutRoutine.findUniqueOrThrow({ where: { logId }, include: { schedules: true, definitions: { include: { exercises: true } } } });
    await changeEntryExercise(userId, logId, await change(active.id, ids[2], ids[0]));
    let current = (await detail(active.id))!;
    expect(current.exercises.map((item) => item.exercise.id)).toEqual([ids[2], ids[1]]);
    expect(current.sessions.filter((item) => item.exercise.id === ids[0])).toHaveLength(1);
    expect(current.sessions.filter((item) => item.exercise.id === ids[2])).toHaveLength(1);
    await changeEntryExercise(userId, logId, await change(active.id, ids[0]));
    await session(active.id, ids[3]); // Unplanned logging never extends either list.
    current = (await detail(active.id))!;
    expect(current.exercises.map((item) => item.exercise.id)).toEqual([ids[2], ids[1], ids[0]]);
    for (const saved of [recorded, otherRecorded]) expect(await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id }, include: { sets: true } })).toEqual(saved);
    expect(Number(recorded.workingVolume)).toBe(500);
    expect(await prisma.workoutRoutine.findUniqueOrThrow({ where: { logId }, include: { schedules: true, definitions: { include: { exercises: true } } } })).toEqual(routineBefore);
    await endEntry(userId, logId, active.id, false);
    expect(await detail(active.id)).toBeNull();
    expect((await detail((await start()).id))!.exercises.map((item) => item.exercise.id)).toEqual(ids.slice(0, 2));
  });
  it("captures session-form Start atomically, and exact session retries never reset daily changes", async () => {
    const current = (await getWorkoutSelection(userId, logId))!, form = new FormData();
    for (const [key, value] of Object.entries({ exerciseId: ids[0], requestId: randomUUID(), performedDate, workoutSelection: "start", routineId: current.routineId,
      routineRevision: String(current.revision), nextDefinitionId: current.nextId, setCount: "1", "sets.0.repetitions": "10", "sets.0.kilograms": "50" })) form.set(key, value);
    fault.capture = true;
    await expect(createWeightliftingSessionAction({}, form)).rejects.toThrow("ENTRY_PLAN_CAPTURE_FAILURE");
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(0);
    expect(await prisma.weightliftingSession.count({ where: { logId } })).toBe(0);
    await expect(createWeightliftingSessionAction({}, form)).rejects.toThrow("NEXT_REDIRECT");
    const active = await prisma.workoutEntry.findFirstOrThrow({ where: { logId } });
    expect((await detail(active.id))!.exercises).toHaveLength(2);
    await changeEntryExercise(userId, logId, await change(active.id));
    await expect(createWeightliftingSessionAction({}, form)).rejects.toThrow("NEXT_REDIRECT");
    expect((await detail(active.id))!.exercises).toHaveLength(3);
    expect(await prisma.weightliftingSet.count({ where: { session: { logId } } })).toBe(1);
  });
  it("initializes legacy active lists only on a successful edit, including rollback of initialization", async () => {
    const active = await start(); await legacy(active.id);
    expect((await detail(active.id))!.exercises.map((item) => item.exercise.id)).toEqual(ids.slice(0, 2));
    expect(await prisma.workoutEntryExercise.count({ where: { entryId: active.id } })).toBe(0);
    const input = await change(active.id); fault.receipt = true;
    await expect(changeEntryExercise(userId, logId, input)).rejects.toThrow("ENTRY_PLAN_RECEIPT_FAILURE");
    expect((await entry(active.id)).exercisePlanRevision).toBeNull();
    expect(await prisma.workoutEntryExercise.count({ where: { entryId: active.id } })).toBe(0);
    expect(await prisma.workoutScheduleRequest.count({ where: { userId, requestId: input.requestId } })).toBe(0);
    fault.collision = true;
    await expect(changeEntryExercise(userId, logId, input)).rejects.toThrow("request was already used");
    expect((await entry(active.id)).exercisePlanRevision).toBeNull();
    expect(await prisma.workoutEntryExercise.count({ where: { entryId: active.id } })).toBe(0);
    await changeEntryExercise(userId, logId, input);
    expect((await detail(active.id))!.exercises).toHaveLength(3);
    expect((await entry(active.id)).exercisePlanRevision).toBe(1);
  });
  it("deduplicates concurrent exact requests and never replays an earlier replacement over later changes", async () => {
    const active = await start(), input = await change(active.id, ids[2], ids[0]);
    await Promise.all([changeEntryExercise(userId, logId, input), changeEntryExercise(userId, logId, input)]);
    await changeEntryExercise(userId, logId, await change(active.id, ids[3], ids[2]));
    await changeEntryExercise(userId, logId, input);
    expect((await detail(active.id))!.exercises.map((item) => item.exercise.id)).toEqual([ids[3], ids[1]]);
    expect((await entry(active.id)).exercisePlanRevision).toBe(2);
    await expect(changeEntryExercise(userId, logId, { ...input, exerciseId: ids[0] })).rejects.toThrow("different inputs");
    await endEntry(userId, logId, active.id, true);
    await expect(changeEntryExercise(userId, logId, input)).resolves.toMatchObject({ entryId: active.id });
    await expect(changeEntryExercise(userId, logId, { ...input, requestId: randomUUID() })).rejects.toThrow("ended");
  });
  it("rejects duplicate, missing-source and stale replacements and serializes concurrent choices", async () => {
    const active = await start();
    await expect(changeEntryExercise(userId, logId, await change(active.id, ids[0]))).rejects.toThrow("already in");
    await expect(changeEntryExercise(userId, logId, await change(active.id, ids[2], "missing"))).rejects.toThrow("original exercise changed");
    const first = await change(active.id, ids[2], ids[0]), second = { ...first, requestId: randomUUID(), exerciseId: ids[3] };
    const results = await Promise.allSettled([changeEntryExercise(userId, logId, first), changeEntryExercise(userId, logId, second)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((result) => result.status === "rejected"); expect(failed?.reason.message).toContain("changed");
    expect((await detail(active.id))!.exercises).toHaveLength(2);
    expect((await entry(active.id)).exercisePlanRevision).toBe(1);
  });
  it.each([`${prefix}-pace`, `${prefix}-foreign`, `${prefix}-cross-log`, "deleted"])("rejects unavailable exercise %s", async (exerciseId) => {
    const active = await start();
    await expect(changeEntryExercise(userId, logId, await change(active.id, exerciseId))).rejects.toThrow("available weightlifting");
    expect((await entry(active.id)).exercisePlanRevision).toBe(0);
  });
  it("rejects foreign entry/log/demo inputs, including a reused request ID from another operation", async () => {
    const active = await start(), input = await change(active.id);
    await expect(changeEntryExercise(demo, logId, input)).rejects.toThrow("Log not found");
    await expect(changeEntryExercise(userId, demoLog, input)).rejects.toThrow("Log not found");
    await expect(changeEntryExercise(userId, otherLog, input)).rejects.toThrow("Workout not found");
    await expect(changeEntryExercise(userId, logId, { ...input, entryId: "foreign" })).rejects.toThrow("Workout not found");
    for (const [owner, foreignLog] of [[demo, demoLog], [userId, otherLog]]) {
      const foreignRoutine = await prisma.workoutRoutine.create({ data: { userId: owner, logId: foreignLog, name: "Other", definitions: { create: { name: "Other", position: 0 } } }, include: { definitions: true } });
      const foreignEntry = await prisma.workoutEntry.create({ data: { userId: owner, logId: foreignLog, routineId: foreignRoutine.id, definitionId: foreignRoutine.definitions[0].id,
        name: "Other", slug: "other-fixture", performedAt: new Date(`${performedDate}T00:00:00Z`), requestId: randomUUID() } });
      await expect(changeEntryExercise(userId, logId, { ...input, entryId: foreignEntry.id })).rejects.toThrow("Workout not found");
      expect((await entry(foreignEntry.id)).exercisePlanRevision).toBeNull();
    }
    await prisma.workoutScheduleRequest.create({ data: { userId, routineId: active.routineId, requestId: input.requestId, fingerprint: "other", operation: "SETUP" } });
    await expect(changeEntryExercise(userId, logId, input)).rejects.toThrow("different inputs");
    expect(await getActiveWorkoutDetail(demo, logId, active.id)).toBeNull();
  });
  it.each([false, true])("serializes plan changes with ending the workout (discard=%s)", async (discard) => {
    const active = await start(), recorded = await session(active.id), input = await change(active.id);
    const [edit, end] = await Promise.allSettled([changeEntryExercise(userId, logId, input), endEntry(userId, logId, active.id, discard)]);
    expect(end.status).toBe("fulfilled");
    const finished = await entry(active.id);
    expect(finished.status).toBe(discard ? "DISCARDED" : "COMPLETED");
    expect(finished.exercisePlanRevision).toBe(edit.status === "fulfilled" ? 1 : 0);
    if (edit.status === "rejected") expect(edit.reason.message).toContain("ended");
    const saved = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: recorded.id }, include: { sets: true } });
    expect(saved.sets).toEqual(recorded.sets); expect(Number(saved.workingVolume)).toBe(500);
    expect(saved.workoutEntryId).toBe(discard ? null : active.id);
    expect(await detail(active.id)).toBeNull();
  });
  it("serializes replacement with linked session creation without rewriting its exercise", async () => {
    const active = await start();
    const [, saved] = await Promise.all([changeEntryExercise(userId, logId, await change(active.id, ids[2], ids[0])), session(active.id)]);
    expect(saved.exerciseId).toBe(ids[0]); expect(saved.workoutEntryId).toBe(active.id); expect(Number(saved.totalVolume)).toBe(500);
    const current = (await detail(active.id))!;
    expect(current.exercises.map((item) => item.exercise.id)).toEqual([ids[2], ids[1]]);
    expect(current.sessions[0].exercise.id).toBe(ids[0]);
  });
  it("serializes exercise deletion against addition and leaves no dangling list rows", async () => {
    const active = await start(), input = await change(active.id), form = new FormData(); form.set("exerciseId", ids[2]);
    const [edit, deletion] = await Promise.allSettled([changeEntryExercise(userId, logId, input), deleteExerciseAction(form)]);
    expect(deletion.status).toBe("rejected"); if (deletion.status === "rejected") expect(deletion.reason.message).toContain("NEXT_REDIRECT");
    if (edit.status === "rejected") expect(edit.reason.message).toContain("available weightlifting");
    expect(await prisma.workoutEntryExercise.count({ where: { exerciseId: ids[2] } })).toBe(0);
    expect((await detail(active.id))!.exercises.map((item) => item.exercise.id)).toEqual(ids.slice(0, 2));
  });
  it.each([false, true])("cleans session-free kind changes and invalidates initialized/legacy forms (legacy=%s)", async (old) => {
    const active = await start(); if (old) await legacy(active.id);
    const stale = await change(active.id), form = new FormData();
    form.set("exerciseId", ids[0]); form.set("title", "Lift 0"); form.set("sessionKind", "PACE");
    await expect(updateExerciseAction({}, form)).rejects.toThrow("NEXT_REDIRECT");
    expect((await detail(active.id))!.exercises.map((item) => item.exercise.id)).toEqual([ids[1]]);
    expect((await entry(active.id)).exercisePlanRevision).toBe(1);
    await expect(changeEntryExercise(userId, logId, stale)).rejects.toThrow("changed");
  });
  it.each(["routine", "log", "user"])("cascades %s deletion without deleting sessions beyond existing rules", async (target) => {
    const active = await start(), saved = await session(active.id);
    if (target === "routine") {
      const current = (await getWorkoutSelection(userId, logId))!;
      await endEntry(userId, logId, active.id, false);
      const revision = (await prisma.workoutRoutine.findUniqueOrThrow({ where: { id: current.routineId } })).revision;
      await deleteRoutine(userId, logId, current.routineId, revision);
      expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id } })).workoutEntryId).toBeNull();
      expect(await prisma.weightliftingSet.count({ where: { sessionId: saved.id } })).toBe(1);
    } else if (target === "log") await prisma.log.delete({ where: { id: logId } });
    else await prisma.user.delete({ where: { id: userId } });
    expect(await prisma.workoutEntryExercise.count({ where: { entryId: active.id } })).toBe(0);
  });
  it.each(["CONTINUOUS", "WEEKLY", "FIXED"] as const)("preserves %s schedule state while editing a captured plan", async (style) => {
    let current = (await getWorkoutSelection(userId, logId))!;
    await saveSchedule(userId, logId, { routineId: current.routineId, revision: current.revision, style, timezone: "UTC", weekStart: 1, effective: "today", confirmed: "yes",
      expectedScheduleId: current.schedule!.id, expectedToday: "2026-11-05", assignments: style === "FIXED" ? [{ weekday: 4, definitionId: current.nextId }] : [] }, now);
    current = (await getWorkoutSelection(userId, logId))!;
    const context = (await getScheduleContext(userId, logId, now))!;
    const active = await prisma.$transaction(async (tx) => startEntry(tx, userId, logId, await lockWorkoutContext(tx, userId, logId), { routineId: current.routineId, revision: current.revision, nextId: current.nextId, requestId: randomUUID(), date: context.today,
      scheduling: { intent: style === "CONTINUOUS" ? "ROTATION" : "SCHEDULED", scheduleId: context.id, today: context.today, slotKey: context.next?.key ?? "", definitionId: current.nextId } }, now));
    const before = await prisma.workoutRoutine.findUniqueOrThrow({ where: { logId }, include: { schedules: { include: { slots: true } } } });
    await changeEntryExercise(userId, logId, await change(active.id));
    expect(await prisma.workoutRoutine.findUniqueOrThrow({ where: { logId }, include: { schedules: { include: { slots: true } } } })).toEqual(before);
    expect((await detail(active.id))!.exercises).toHaveLength(3);
  });
  it("validates authenticated action inputs and revalidates a successful mutation", async () => {
    const active = await start(), form = new FormData(); form.set("logId", demoLog); form.set("payload", "{}");
    expect((await changeEntryExerciseAction({}, form)).error).toBe("Log not found.");
    form.set("logId", logId); form.set("payload", "bad JSON"); expect((await changeEntryExerciseAction({}, form)).error).toContain("Reload");
    form.set("payload", JSON.stringify(await change(active.id)));
    expect((await changeEntryExerciseAction({}, form)).success).toBeDefined();
    expect(revalidatePath).toHaveBeenCalledWith(`/logs/strength/workouts/${active.slug}`);
    expect(revalidatePath).toHaveBeenCalledWith("/logs/strength", "layout");
    expect(entryExerciseChangeSchema.safeParse({ entryId: active.id, requestId: randomUUID(), expectedRevision: -1, exerciseId: ids[2], change: { operation: "replace" } }).success).toBe(false);
  });
});
