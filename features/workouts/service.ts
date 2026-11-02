import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { performedDateSchema, requestIdSchema, routineSchema } from "./schema";
import { claimEntrySlot, currentSchedule, prepareScheduledEntry, schedulingFingerprint, type SchedulingInput } from "./scheduling";
import { localDate, snapshotSchema } from "./calendar";

type Tx = Prisma.TransactionClient;
export class WorkoutError extends Error {}

// Lock order is always Log -> Routine -> sessions. Lock the log even before a
// routine exists, so setup and standalone/session creation cannot race setup.
export async function lockWorkoutContext(tx: Tx, userId: string, logId: string) {
  const logs = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Log" WHERE "id" = ${logId} AND "userId" = ${userId} FOR UPDATE`;
  if (!logs.length) throw new WorkoutError("Log not found.");
  await tx.$queryRaw`SELECT "id" FROM "WorkoutRoutine" WHERE "logId" = ${logId} AND "userId" = ${userId} FOR UPDATE`;
  return tx.workoutRoutine.findFirst({
    where: { logId, userId },
    include: {
      definitions: { where: { archived: false }, orderBy: { position: "asc" } },
      entries: { where: { status: "IN_PROGRESS", userId, logId } },
    },
  });
}

type Context = Awaited<ReturnType<typeof lockWorkoutContext>>;

export function assertRevision(routine: Context, routineId: string, revision: number, nextId: string) {
  if (!routine || routine.id !== routineId || routine.revision !== revision || routine.nextDefinitionId !== nextId) {
    throw new WorkoutError("The routine changed. Reload the page before continuing.");
  }
}

export async function startEntry(tx: Tx, userId: string, logId: string, routine: Context, input: {
  routineId: string; revision: number; nextId: string; date: string; requestId: string;
  scheduling?: SchedulingInput;
}, now = new Date()) {
  const requestId = requestIdSchema.parse(input.requestId);
  const date = performedDateSchema.parse(input.date);
  const requestFingerprint = schedulingFingerprint({ nextId: input.nextId, date, scheduling: input.scheduling ?? null });
  const previous = await tx.workoutEntry.findUnique({ where: { userId_requestId: { userId, requestId } } });
  if (previous) {
    if (previous.logId !== logId || previous.routineId !== input.routineId || previous.performedAt.toISOString().slice(0, 10) !== date ||
      (previous.requestFingerprint ? previous.requestFingerprint !== requestFingerprint : previous.definitionId !== input.nextId)) {
      throw new WorkoutError("This request was already used for another workout. Reload the page.");
    }
    return previous;
  }
  assertRevision(routine, input.routineId, input.revision, input.nextId);
  if (!routine) throw new WorkoutError("Create a routine first.");
  if (routine.entries.length) throw new WorkoutError("Finish or discard the active workout first, then reload the page.");
  const scheduling = await prepareScheduledEntry(tx, routine, input.scheduling ?? {}, date, now);
  const entry = await tx.workoutEntry.create({ data: {
    userId, logId, routineId: routine.id, ...scheduling,
    performedAt: new Date(`${date}T00:00:00.000Z`), requestId,
    requestFingerprint,
  } });
  await claimEntrySlot(tx, routine, entry, false, now);
  await tx.workoutRoutine.update({ where: { id: routine.id }, data: { revision: { increment: 1 } } });
  return entry;
}

export async function saveRoutine(userId: string, logId: string, raw: unknown, now = new Date()) {
  const input = routineSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    let routine = await lockWorkoutContext(tx, userId, logId);
    if (routine?.entries.length) throw new WorkoutError("Finish or discard the active workout before editing the routine.");
    if ((routine?.revision ?? 0) !== input.revision) throw new WorkoutError("The routine changed. Reload the page.");
    if (routine && await tx.workoutSchedule.count({ where: { routineId: routine.id, effectiveAt: { gt: now } } })) throw new WorkoutError("Cancel the pending schedule change before editing workout names or order.");
    if (!routine) {
      const created = await tx.workoutRoutine.create({ data: { userId, logId, name: input.name } });
      routine = { ...created, definitions: [], entries: [] };
    }
    const retainedIds = new Set(routine.definitions.map((definition) => definition.id));
    const nextIds = new Map<string, string>();
    for (const [position, workout] of input.workouts.entries()) {
      if (workout.id.startsWith("new:")) {
        const created = await tx.workoutDefinition.create({ data: { routineId: routine.id, name: workout.name, position } });
        nextIds.set(workout.id, created.id);
      } else {
        if (!retainedIds.has(workout.id)) throw new WorkoutError("A workout no longer belongs to this routine. Reload the page.");
        await tx.workoutDefinition.update({ where: { id: workout.id }, data: { name: workout.name, position } });
        nextIds.set(workout.id, workout.id);
      }
    }
    await tx.workoutDefinition.updateMany({
      where: { routineId: routine.id, id: { notIn: [...nextIds.values()] } }, data: { archived: true },
    });
    await tx.workoutRoutine.update({ where: { id: routine.id }, data: {
      name: input.name, nextDefinitionId: nextIds.get(input.nextId)!, revision: { increment: 1 },
    } });
    const schedule = await currentSchedule(tx, routine.id, now);
    if (schedule && (input.expectedScheduleId !== schedule.id || input.expectedToday !== localDate(now, schedule.timezone))) throw new WorkoutError("The schedule date changed. Reload settings before saving.");
    if (schedule && schedule.style !== "CONTINUOUS") {
      // Definition edits establish a new version from today. Past snapshots stay
      // immutable; fixed assignments must be updated before removing a used type.
      const prior = snapshotSchema.parse(schedule.workouts);
      if (schedule.style === "FIXED" && prior.some((item) => !nextIds.has(item.definitionId))) throw new WorkoutError("Change weekday assignments before removing an assigned workout.");
      if (nextIds.has(routine.nextDefinitionId ?? "") && input.nextId !== routine.nextDefinitionId) throw new WorkoutError("Use schedule controls to choose a workout for weekly routines.");
      const today = localDate(now, schedule.timezone);
      const workouts = schedule.style === "FIXED" ? prior.map((item) => ({ ...item, name: input.workouts.find((workout) => workout.id === item.definitionId)!.name }))
        : input.workouts.map((item) => ({ definitionId: nextIds.get(item.id)!, name: item.name }));
      // Saving unchanged names/order must not reset this week's progress.
      if (JSON.stringify(workouts) !== JSON.stringify(prior)) {
        if (input.applyTodayConfirmed !== "yes") throw new WorkoutError("Confirm applying workout changes today.");
        await tx.workoutSchedule.update({ where: { id: schedule.id }, data: { endAt: now, endDate: today } });
        await tx.workoutSchedule.create({ data: { routineId: routine.id, style: schedule.style, timezone: schedule.timezone, weekStart: schedule.weekStart, effectiveAt: now, startDate: today, workouts } });
      }
    }
  });
}

export async function endEntry(userId: string, logId: string, entryId: string, discard: boolean, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const routine = await lockWorkoutContext(tx, userId, logId);
    const entry = await tx.workoutEntry.findFirst({ where: { id: entryId, userId, logId, routineId: routine?.id ?? "" } });
    if (!routine || !entry) throw new WorkoutError("Workout not found.");
    const target = discard ? "DISCARDED" : "COMPLETED";
    if (entry.status === target) return;
    if (entry.status !== "IN_PROGRESS") throw new WorkoutError("This workout has already ended. Reload the page.");
    if (discard) {
      await tx.weightliftingSession.updateMany({ where: { userId, logId, workoutEntryId: entry.id }, data: { workoutEntryId: null } });
      await tx.workoutSlot.updateMany({ where: { entryId: entry.id, schedule: { routineId: routine.id } }, data: { entryId: null } });
    } else {
      const count = await tx.weightliftingSession.count({ where: { userId, logId, workoutEntryId: entry.id } });
      if (!count) throw new WorkoutError("Record at least one exercise session before finishing, or discard the workout.");
    }
    const position = routine.definitions.findIndex((definition) => definition.id === (entry.schedulingIntent === "ROTATION" ? routine.nextDefinitionId : entry.definitionId));
    if (entry.schedulingIntent === "ROTATION" && position < 0) throw new WorkoutError("The workout is no longer in this routine.");
    if (!discard) await claimEntrySlot(tx, routine, entry, true, now);
    await tx.workoutEntry.update({ where: { id: entry.id }, data: { status: target, completedAt: discard ? null : now } });
    await tx.workoutRoutine.update({ where: { id: routine.id }, data: {
      revision: { increment: 1 },
      ...(!discard && entry.schedulingIntent === "ROTATION" ? { nextDefinitionId: routine.definitions[(position + 1) % routine.definitions.length].id } : {}),
    } });
  });
}

export async function resolveSessionWorkout(tx: Tx, userId: string, logId: string, routine: Context, form: FormData, date: string, now = new Date()) {
  const selection = String(form.get("workoutSelection") ?? "standalone");
  if (selection === "standalone") return null;
  if (selection === "start") {
    const entry = await startEntry(tx, userId, logId, routine, {
      routineId: String(form.get("routineId") ?? ""), revision: Number(form.get("routineRevision")),
      nextId: String(form.get("nextDefinitionId") ?? ""), date,
      requestId: String(form.get("requestId") ?? ""),
      scheduling: form.has("schedulingIntent") ? {
        intent: String(form.get("schedulingIntent")) as "ROTATION" | "SCHEDULED" | "MAKEUP" | "EXTRA",
        scheduleId: String(form.get("scheduleId") ?? ""), slotKey: String(form.get("slotKey") ?? ""),
        definitionId: String(form.get("chosenDefinitionId") ?? ""), today: String(form.get("scheduleToday") ?? ""),
      } : undefined,
    }, now);
    if (entry.status !== "IN_PROGRESS") throw new WorkoutError("This workout has ended. Reload the page.");
    return entry.id;
  }
  const entry = routine?.entries.find((item) => item.id === selection);
  if (!entry || entry.userId !== userId || entry.logId !== logId || entry.performedAt.toISOString().slice(0, 10) !== date) {
    throw new WorkoutError("Choose an in-progress workout with the same date, or select Standalone.");
  }
  return entry.id;
}

export async function deleteRoutine(userId: string, logId: string, routineId: string, revision: number) {
  return prisma.$transaction(async (tx) => {
    const routine = await lockWorkoutContext(tx, userId, logId);
    if (!routine) return; // An identical retry after deletion is harmless.
    if (routine.id !== routineId || routine.revision !== revision) {
      throw new WorkoutError("The routine changed. Reload the page before deleting it.");
    }
    if (routine.entries.length) {
      throw new WorkoutError("Finish or discard the active workout before deleting the routine.");
    }
    // Entry/definition records cascade; session foreign keys become null.
    // The exercise sessions, sets, and their derived metrics are preserved.
    await tx.workoutRoutine.delete({ where: { id: routine.id, userId, logId } });
  });
}
