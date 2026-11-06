import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { prisma } from "@/lib/db";
import { cancelSchedule, saveSchedule, scheduleControl } from "./scheduling";
import { endEntry, lockWorkoutContext, saveRoutine, startEntry, deleteRoutine, resolveSessionWorkout } from "./service";
import { getScheduleContext, getScheduleWeek } from "./schedule-queries";
import { createHistoricalWorkout, reassignWorkoutSession } from "./history";
import { createWorkoutFixture } from "@/tests/fixtures/workout";

const fault = vi.hoisted(() => ({ revision: false }));
vi.mock("@/lib/db", async (importOriginal) => {
  const { prisma: base } = await importOriginal<typeof import("@/lib/db")>();
  return { prisma: base.$extends({ query: { workoutRoutine: { update({ args, query }) {
    if (fault.revision) { fault.revision = false; throw new Error("SCHEDULE_REVISION_FAILURE"); }
    return query(args);
  } } } }) };
});

vi.setConfig({ testTimeout: 45_000, hookTimeout: 30_000 });
const prefix = `scheduling-${randomUUID()}`;
const userId = `${prefix}-user`, logId = `${prefix}-log`, exerciseId = `${prefix}-exercise`;
const foreignUser = `${prefix}-demo`, foreignLog = `${prefix}-demo-log`;
const monday = new Date("2026-10-26T12:00:00Z"), tuesday = new Date("2026-10-27T12:00:00Z"), thursday = new Date("2026-10-29T12:00:00Z"), nextMonday = new Date("2026-11-02T12:00:00Z");
const getRoutine = () => prisma.workoutRoutine.findUniqueOrThrow({ where: { logId }, include: { definitions: { where: { archived: false }, orderBy: { position: "asc" } } } });
async function configure(style: "WEEKLY" | "FIXED" | "CONTINUOUS", now = monday, effective: "today" | "nextWeek" = "today") {
  const routine = await getRoutine();
  const before = (await getScheduleContext(userId, logId, now))!;
  await saveSchedule(userId, logId, { routineId: routine.id, revision: routine.revision, style, timezone: "UTC", weekStart: 1, effective, confirmed: "yes", expectedScheduleId: before.id, expectedToday: before.today, assignments: style === "FIXED" ? [{ weekday: 2, definitionId: routine.definitions[1].id }, { weekday: 4, definitionId: routine.definitions[2].id }] : [] }, now);
  return (await getScheduleContext(userId, logId, now))!;
}
async function startInput(now = monday, extra: Partial<NonNullable<Parameters<typeof startEntry>[4]["scheduling"]>> = {}) {
  const routine = await getRoutine(), schedule = (await getScheduleContext(userId, logId, now))!;
  return { routineId: routine.id, revision: routine.revision, nextId: routine.nextDefinitionId!, requestId: randomUUID(), date: schedule.today,
    scheduling: { intent: (schedule.style === "CONTINUOUS" ? "ROTATION" : "SCHEDULED") as "ROTATION" | "SCHEDULED" | "EXTRA" | "MAKEUP", scheduleId: schedule.id, slotKey: schedule.next?.key ?? "", today: schedule.today, definitionId: schedule.next?.definitionId ?? "", ...extra } };
}
async function start(input: Awaited<ReturnType<typeof startInput>>, now = monday) {
  return prisma.$transaction(async (tx) => startEntry(tx, userId, logId, await lockWorkoutContext(tx, userId, logId), input, now));
}
async function session(entryId: string | null, date = "2026-10-26") {
  return prisma.weightliftingSession.create({ data: { userId, logId, exerciseId, workoutEntryId: entryId, performedAt: new Date(`${date}T00:00:00Z`), totalVolume: "500", workingVolume: "500", sets: { create: { position: 1, repetitions: "10", kilograms: "50", volume: "500", isHard: true } } } });
}
async function finish(entry: { id: string; performedAt: Date }, now = monday) {
  await session(entry.id, entry.performedAt.toISOString().slice(0, 10));
  await endEntry(userId, logId, entry.id, false, now);
}
async function control(operation: "skip" | "reset", now = monday) {
  const routine = await getRoutine(), schedule = (await getScheduleContext(userId, logId, now))!;
  return { routineId: routine.id, revision: routine.revision, requestId: randomUUID(), operation, scheduleId: schedule.id, slotKey: schedule.next?.key ?? "", today: schedule.today, nextId: routine.nextDefinitionId! };
}

describe("workout scheduling lifecycle", () => {
  beforeEach(async () => {
    fault.revision = false;
    await prisma.user.create({ data: { id: userId } });
    await prisma.user.create({ data: { id: foreignUser, demoExpiresAt: new Date(Date.now() + 3600000) } });
    await prisma.log.createMany({ data: [{ id: logId, userId, title: "Strength", slug: "strength" }, { id: foreignLog, userId: foreignUser, title: "Demo", slug: "demo" }] });
    await prisma.exercise.create({ data: { id: exerciseId, userId, logId, title: "Squat", slug: "squat", sessionKind: "WEIGHTLIFTING" } });
    await createWorkoutFixture(userId, logId, ["A", "B", "C"].map((name) => ({ name })));
  });
  afterEach(async () => { await prisma.user.deleteMany({ where: { id: { in: [userId, foreignUser] } } }); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("runs one weekly cycle, restarts next week, and leaves the continuous pointer unchanged", async () => {
    await configure("WEEKLY");
    const original = (await getRoutine()).nextDefinitionId;
    for (const name of ["A", "B", "C"]) { const entry = await start(await startInput()); expect(entry.name).toBe(name); await finish(entry); }
    expect((await getScheduleContext(userId, logId, monday))!.next).toBeNull();
    expect((await getRoutine()).nextDefinitionId).toBe(original);
    expect((await getScheduleContext(userId, logId, nextMonday))!.next?.name).toBe("A");
  });
  it("does not move Thursday after missing Tuesday and records no rest-day misses", async () => {
    const plan = await configure("FIXED");
    expect(plan.next).toBeNull();
    const context = (await getScheduleContext(userId, logId, thursday))!;
    expect(context.next?.name).toBe("C");
    expect(context.choices.map((item) => item.outcome)).toEqual(["MISSED", "PENDING"]);
    expect(context.choices).toHaveLength(2);
    const extraDefinition = (await getRoutine()).definitions[0].id;
    await prisma.workoutExercise.create({ data: { definitionId: extraDefinition, exerciseId, position: 0 } });
    const extra = await start(await startInput(monday, { intent: "EXTRA", definitionId: extraDefinition }));
    expect((await prisma.workoutEntryExercise.findMany({ where: { entryId: extra.id } })).map((item) => item.exerciseId)).toEqual([exerciseId]);
    await finish(extra);
    expect((await getScheduleContext(userId, logId, thursday))!.next?.name).toBe("C");
    const scheduledExercise = await prisma.exercise.create({ data: { userId, logId, title: "Press", slug: "press", sessionKind: "WEIGHTLIFTING" } });
    const routine = await getRoutine();
    await prisma.workoutExercise.create({ data: { definitionId: routine.definitions[2].id, exerciseId: scheduledExercise.id, position: 0 } });
    const scheduled = await start(await startInput(thursday), thursday);
    expect(routine.nextDefinitionId).toBe(routine.definitions[0].id);
    expect(scheduled.definitionId).toBe(routine.definitions[2].id);
    expect((await prisma.workoutEntryExercise.findMany({ where: { entryId: scheduled.id } })).map((item) => item.exerciseId)).toEqual([scheduledExercise.id]);
  });
  it("substitutes a workout, fulfills exactly one slot, and allows no double completion", async () => {
    await configure("WEEKLY");
    const routine = await getRoutine();
    await prisma.workoutExercise.create({ data: { definitionId: routine.definitions[2].id, exerciseId, position: 0 } });
    const input = await startInput(monday, { definitionId: routine.definitions[2].id });
    const [entry, retry] = await Promise.all([start(input), start(input)]);
    expect(entry.id).toBe(retry.id); expect(entry.name).toBe("C"); expect(entry.plannedName).toBe("A");
    expect((await prisma.workoutEntryExercise.findMany({ where: { entryId: entry.id } })).map((item) => item.exerciseId)).toEqual([exerciseId]);
    await session(entry.id);
    await Promise.all([endEntry(userId, logId, entry.id, false, monday), endEntry(userId, logId, entry.id, false, monday)]);
    expect((await getScheduleContext(userId, logId, monday))!.next?.name).toBe("B");
    expect(await prisma.workoutSlot.count({ where: { entryId: entry.id, outcome: "COMPLETED" } })).toBe(1);
    await expect(start({ ...input, scheduling: { ...input.scheduling, definitionId: routine.definitions[1].id } })).rejects.toThrow("already used");
  });
  it("retains an old active workout across a boundary and never consumes the new week's slot", async () => {
    await configure("WEEKLY");
    const entry = await start(await startInput());
    await finish(entry, nextMonday);
    expect((await getScheduleContext(userId, logId, nextMonday))!.next?.name).toBe("A");
    const history = await getScheduleWeek(userId, logId, "2026-10-26", 1, nextMonday);
    expect(history.rows.map((item) => item.outcome)).toEqual(["COMPLETED", "MISSED", "MISSED"]);
  });
  it("skips, makes up, and discards without consuming unrelated slots", async () => {
    await configure("FIXED");
    const skip = await control("skip", tuesday);
    await Promise.all([scheduleControl(userId, logId, skip, tuesday), scheduleControl(userId, logId, skip, tuesday)]);
    const skipped = (await getScheduleContext(userId, logId, thursday))!.choices[0];
    const entry = await start(await startInput(thursday, { intent: "MAKEUP", scheduleId: skipped.scheduleId, slotKey: skipped.key, definitionId: skipped.definitionId }), thursday);
    await session(entry.id, "2026-10-29");
    await endEntry(userId, logId, entry.id, true, thursday);
    expect((await getScheduleContext(userId, logId, thursday))!.choices[0].outcome).toBe("SKIPPED");
    const again = await start(await startInput(thursday, { intent: "MAKEUP", scheduleId: skipped.scheduleId, slotKey: skipped.key, definitionId: skipped.definitionId }), thursday);
    await finish(again, thursday);
    const context = (await getScheduleContext(userId, logId, thursday))!;
    expect(context.next?.name).toBe("C");
    expect(context.choices[0].outcome).toBe("COMPLETED");
    const stored = await prisma.workoutSlot.findUniqueOrThrow({ where: { scheduleId_key: { scheduleId: skipped.scheduleId, key: skipped.key } } });
    expect(stored.originalOutcome).toBe("SKIPPED");
  });
  it("rejects stale dates, foreign slots, duplicate weekdays, and edits while active", async () => {
    await configure("FIXED");
    const input = await startInput(tuesday);
    await expect(start(input, thursday)).rejects.toThrow("date changed");
    await expect(start({ ...input, scheduling: { ...input.scheduling, scheduleId: "foreign" } }, tuesday)).rejects.toThrow("not found");
    await start(input, tuesday);
    await expect(configure("WEEKLY", tuesday)).rejects.toThrow("active workout");
    expect(await getScheduleContext(foreignUser, logId, tuesday)).toBeNull();
    expect((await getScheduleWeek(foreignUser, logId, "2026-10-27", 1, tuesday)).rows).toEqual([]);
    await expect(saveSchedule(foreignUser, logId, { routineId: input.routineId, revision: input.revision, style: "WEEKLY", timezone: "UTC", weekStart: 1, effective: "today", confirmed: "yes", expectedScheduleId: input.scheduling.scheduleId, expectedToday: "2026-10-27", assignments: [] }, tuesday)).rejects.toThrow("Log not found");
  });
  it("rejects duplicate or empty weekday assignments without changing the plan", async () => {
    const schedule = await configure("FIXED");
    const routine = await getRoutine();
    const settings = { routineId: routine.id, revision: routine.revision, style: "FIXED", timezone: "UTC", weekStart: 1, effective: "today", confirmed: "yes", expectedScheduleId: schedule.id, expectedToday: schedule.today };
    await expect(saveSchedule(userId, logId, { ...settings, assignments: [{ weekday: 2, definitionId: routine.definitions[0].id }, { weekday: 2, definitionId: routine.definitions[1].id }] }, monday)).rejects.toThrow("one workout per weekday");
    await expect(saveSchedule(userId, logId, { ...settings, assignments: [] }, monday)).rejects.toThrow("at least one weekday");
    expect((await getRoutine()).revision).toBe(routine.revision);
    expect(await prisma.workoutSchedule.count({ where: { routineId: routine.id } })).toBe(1);
  });
  it("allows only one winner for distinct claims or skips and rolls back losing starts", async () => {
    await configure("WEEKLY");
    const input = await startInput();
    const claims = await Promise.allSettled([start(input), start({ ...input, requestId: randomUUID() })]);
    expect(claims.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(1);
    const entry = await prisma.workoutEntry.findFirstOrThrow({ where: { logId } });
    await endEntry(userId, logId, entry.id, true, monday);
    const skip = await control("skip");
    const skips = await Promise.allSettled([scheduleControl(userId, logId, skip, monday), scheduleControl(userId, logId, { ...skip, requestId: randomUUID() }, monday)]);
    expect(skips.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.workoutSlot.count({ where: { schedule: { routineId: input.routineId }, outcome: "SKIPPED", entryId: null } })).toBe(1);
  });
  it("serializes historical fulfillment against a scheduled start of the same slot", async () => {
    await configure("WEEKLY");
    const input = await startInput(), standalone = await session(null);
    const group = { routineId: input.routineId, revision: input.revision, requestId: randomUUID(), definitionId: input.nextId, performedDate: input.date, sessionIds: [standalone.id], scheduleId: input.scheduling.scheduleId, slotKey: input.scheduling.slotKey };
    const results = await Promise.allSettled([start(input), createHistoricalWorkout(userId, logId, group, monday)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const entries = await prisma.workoutEntry.findMany({ where: { logId } });
    expect(entries).toHaveLength(1);
    const linked = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: standalone.id } });
    expect(linked.workoutEntryId).toBe(entries[0].status === "COMPLETED" ? entries[0].id : null);
    expect(await prisma.workoutSlot.count({ where: { scheduleId: input.scheduling.scheduleId, entryId: entries[0].id } })).toBe(1);
  });
  it("rolls back the entry, slot claim, and associations after a late historical failure", async () => {
    await configure("WEEKLY");
    const input = await startInput(), standalone = await session(null);
    fault.revision = true;
    await expect(createHistoricalWorkout(userId, logId, { routineId: input.routineId, revision: input.revision, requestId: randomUUID(), definitionId: input.nextId, performedDate: input.date, sessionIds: [standalone.id], scheduleId: input.scheduling.scheduleId, slotKey: input.scheduling.slotKey }, monday)).rejects.toThrow("SCHEDULE_REVISION_FAILURE");
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(0);
    expect(await prisma.workoutSlot.count({ where: { scheduleId: input.scheduling.scheduleId } })).toBe(0);
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: standalone.id } })).workoutEntryId).toBeNull();
    expect((await getRoutine()).nextDefinitionId).toBe(input.nextId);
    expect((await getRoutine()).revision).toBe(input.revision);
  });
  it("rejects settings saved after activation, preserves next pending date, and rejects conflicting weekly reset", async () => {
    await configure("WEEKLY");
    const previous = (await getScheduleContext(userId, logId, tuesday))!;
    await configure("FIXED", tuesday, "nextWeek");
    const routine = await getRoutine();
    await expect(scheduleControl(userId, logId, await control("reset", tuesday), tuesday)).rejects.toThrow("pending schedule");
    const stale = { routineId: routine.id, revision: routine.revision, style: "CONTINUOUS", timezone: "UTC", weekStart: 1, effective: "today", confirmed: "yes", expectedScheduleId: previous.id, expectedToday: previous.today, assignments: [] };
    await expect(saveSchedule(userId, logId, stale, nextMonday)).rejects.toThrow("schedule date changed");
    const pending = (await getScheduleContext(userId, logId, tuesday))!.pending!;
    expect((await getScheduleContext(userId, logId, nextMonday))!.id).toBe(pending.id);
    await configure("FIXED", nextMonday);
    const now = new Date("2026-11-08T12:00:00Z"), current = await getRoutine(), context = (await getScheduleContext(userId, logId, now))!;
    await saveSchedule(userId, logId, { routineId: current.id, revision: current.revision, style: "FIXED", timezone: "UTC", weekStart: 1, effective: "nextWeek", confirmed: "yes", expectedScheduleId: context.id, expectedToday: context.today, assignments: [{ weekday: 1, definitionId: current.definitions[0].id }] }, now);
    expect((await getScheduleContext(userId, logId, now))!.nextDate).toBe("2026-11-09");
  });
  it("rejects configured backdated rotation starts but permits explicit extras", async () => {
    await configure("CONTINUOUS");
    const input = await startInput();
    await expect(start({ ...input, date: "2026-10-25" })).rejects.toThrow("Extra workout");
    const extra = await start({ ...input, date: "2026-10-25", scheduling: { ...input.scheduling, intent: "EXTRA", definitionId: input.nextId } });
    await finish(extra);
    expect((await getRoutine()).nextDefinitionId).toBe(input.nextId);
  });
  it("shows upcoming pending slots by activation instant across timezone date boundaries", async () => {
    const routine = await getRoutine(), initial = (await getScheduleContext(userId, logId, monday))!;
    await saveSchedule(userId, logId, { routineId: routine.id, revision: routine.revision, style: "FIXED", timezone: "Asia/Tokyo", weekStart: 1, effective: "today", confirmed: "yes", expectedScheduleId: initial.id, expectedToday: initial.today, assignments: [{ weekday: 2, definitionId: routine.definitions[0].id }] }, monday);
    const sunday = new Date("2026-11-08T14:00:00Z"), current = await getRoutine(), context = (await getScheduleContext(userId, logId, sunday))!;
    await saveSchedule(userId, logId, { routineId: current.id, revision: current.revision, style: "FIXED", timezone: "America/Los_Angeles", weekStart: 1, effective: "nextWeek", confirmed: "yes", expectedScheduleId: context.id, expectedToday: context.today, assignments: [{ weekday: 0, definitionId: current.definitions[1].id }] }, sunday);
    const upcoming = (await getScheduleContext(userId, logId, sunday))!;
    expect(upcoming.nextDate).toBe("2026-11-08"); expect(upcoming.nextDateTimezone).toBe("America/Los_Angeles");
  });
  it("keeps one pending version, rejects definition edits, and cancels it without changing the current plan", async () => {
    await configure("WEEKLY");
    await configure("FIXED", tuesday, "nextWeek");
    let routine = await getRoutine();
    await expect(saveRoutine(userId, logId, { name: routine.name, revision: routine.revision, workouts: routine.definitions, nextId: routine.nextDefinitionId }, tuesday)).rejects.toThrow("pending schedule");
    await configure("CONTINUOUS", tuesday, "nextWeek");
    expect(await prisma.workoutSchedule.count({ where: { routineId: routine.id, effectiveAt: { gt: tuesday } } })).toBe(1);
    routine = await getRoutine();
    await cancelSchedule(userId, logId, routine.id, routine.revision, tuesday);
    expect((await getScheduleContext(userId, logId, nextMonday))!.style).toBe("WEEKLY");
    expect((await getScheduleContext(userId, logId, tuesday))!.pending).toBeNull();
  });
  it("starts a new midweek list and preserves superseded plans and completed snapshots", async () => {
    await configure("WEEKLY");
    const entry = await start(await startInput()); await finish(entry);
    await configure("WEEKLY", thursday);
    expect((await getScheduleContext(userId, logId, thursday))!.next?.name).toBe("A");
    const rows = (await getScheduleWeek(userId, logId, "2026-10-29", 1, thursday)).rows;
    expect(rows.filter((row) => row.outcome === "SUPERSEDED")).toHaveLength(2);
    expect(rows.find((row) => row.entry?.id === entry.id)?.entry?.name).toBe("A");
  });
  it("makes historical fulfillment explicit, leaves suggestions and metrics untouched, and never reattaches on retry", async () => {
    await configure("WEEKLY");
    const schedule = (await getScheduleContext(userId, logId, monday))!, routine = await getRoutine();
    const saved = await session(null);
    const snapshot = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id }, include: { sets: true } });
    const request = { routineId: routine.id, revision: routine.revision, definitionId: routine.definitions[0].id, performedDate: "2026-10-26", sessionIds: [saved.id], requestId: randomUUID(), scheduleId: schedule.id, slotKey: schedule.next!.key };
    const entry = await createHistoricalWorkout(userId, logId, request, nextMonday);
    const linked = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id }, include: { sets: true } });
    expect(linked.sets).toEqual(snapshot.sets); expect(linked.totalVolume).toEqual(snapshot.totalVolume); expect(linked.performedAt).toEqual(snapshot.performedAt);
    await reassignWorkoutSession(userId, logId, { routineId: routine.id, sessionId: linked.id, expectedEntryId: entry.id, expectedUpdatedAt: linked.updatedAt.toISOString(), targetEntryId: "" });
    expect((await createHistoricalWorkout(userId, logId, request, nextMonday)).id).toBe(entry.id);
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id } })).workoutEntryId).toBeNull();
    expect(await prisma.workoutExercise.count({ where: { definition: { routineId: routine.id } } })).toBe(0);
    expect((await getScheduleContext(userId, logId, monday))!.next?.name).toBe("B");
    expect((await getRoutine()).nextDefinitionId).toBe(routine.nextDefinitionId);
  });
  it("supports atomic session-form starts for an archived scheduled definition without changing assignments", async () => {
    await configure("FIXED");
    const context = (await getScheduleContext(userId, logId, thursday))!, routine = await getRoutine();
    await prisma.workoutExercise.create({ data: { definitionId: context.choices[0].definitionId, exerciseId, position: 0 } });
    await prisma.workoutDefinition.update({ where: { id: context.choices[0].definitionId }, data: { archived: true } });
    const form = new FormData();
    for (const [key, value] of Object.entries({ workoutSelection: "start", routineId: routine.id, routineRevision: String(routine.revision), nextDefinitionId: routine.nextDefinitionId!, requestId: randomUUID(), schedulingIntent: "MAKEUP", scheduleId: context.id, slotKey: context.choices[0].key, chosenDefinitionId: context.choices[0].definitionId, scheduleToday: context.today })) form.set(key, value);
    const date = "2026-10-29";
    await prisma.$transaction(async (tx) => {
      const locked = await lockWorkoutContext(tx, userId, logId);
      const id = await resolveSessionWorkout(tx, userId, logId, locked, form, date, thursday);
      await tx.weightliftingSession.create({ data: { userId, logId, exerciseId, workoutEntryId: id, performedAt: new Date(`${date}T00:00:00Z`) } });
    });
    expect(await prisma.workoutExercise.count({ where: { definitionId: context.choices[0].definitionId } })).toBe(1);
    const captured = await prisma.workoutEntryExercise.findMany({ where: { entry: { userId, logId, schedulingIntent: "MAKEUP" } } });
    expect(captured.map((item) => item.exerciseId)).toEqual([exerciseId]);
  });
  it("keeps reset/extra actions separate from progress and cascades schedules while keeping training", async () => {
    await configure("CONTINUOUS");
    const skip = await control("skip"); await scheduleControl(userId, logId, skip, monday);
    expect((await getRoutine()).nextDefinitionId).toBe((await getRoutine()).definitions[1].id);
    await expect(scheduleControl(userId, logId, { ...skip, operation: "reset" }, monday)).rejects.toThrow("already used");
    await scheduleControl(userId, logId, await control("reset"), monday);
    const extra = await start(await startInput(monday, { intent: "EXTRA", definitionId: (await getRoutine()).definitions[2].id })); await finish(extra);
    const routine = await getRoutine(); expect(routine.nextDefinitionId).toBe(routine.definitions[0].id);
    await deleteRoutine(userId, logId, routine.id, routine.revision);
    expect(await prisma.workoutSchedule.count({ where: { routineId: routine.id } })).toBe(0);
    expect(await prisma.weightliftingSession.count({ where: { logId, workoutEntryId: null } })).toBe(1);
    expect(await prisma.weightliftingSet.count({ where: { session: { logId } } })).toBe(1);
  });
});
