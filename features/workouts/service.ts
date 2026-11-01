import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { performedDateSchema, requestIdSchema, routineSchema } from "./schema";

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
}) {
  const requestId = requestIdSchema.parse(input.requestId);
  const date = performedDateSchema.parse(input.date);
  const previous = await tx.workoutEntry.findUnique({ where: { userId_requestId: { userId, requestId } } });
  if (previous) {
    if (previous.logId !== logId || previous.routineId !== input.routineId || previous.definitionId !== input.nextId || previous.performedAt.toISOString().slice(0, 10) !== date) {
      throw new WorkoutError("This request was already used for another workout. Reload the page.");
    }
    return previous;
  }
  assertRevision(routine, input.routineId, input.revision, input.nextId);
  if (!routine) throw new WorkoutError("Create a routine first.");
  if (routine.entries.length) throw new WorkoutError("Finish or discard the active workout first, then reload the page.");
  const definition = routine.definitions.find((item) => item.id === input.nextId);
  if (!definition) throw new WorkoutError("Choose a current workout.");
  const entry = await tx.workoutEntry.create({ data: {
    userId, logId, routineId: routine.id, definitionId: definition.id,
    name: definition.name, performedAt: new Date(`${date}T00:00:00.000Z`), requestId,
  } });
  await tx.workoutRoutine.update({ where: { id: routine.id }, data: { revision: { increment: 1 } } });
  return entry;
}

export async function saveRoutine(userId: string, logId: string, raw: unknown) {
  const input = routineSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    let routine = await lockWorkoutContext(tx, userId, logId);
    if (routine?.entries.length) throw new WorkoutError("Finish or discard the active workout before editing the routine.");
    if ((routine?.revision ?? 0) !== input.revision) throw new WorkoutError("The routine changed. Reload the page.");
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
    if (routine.nextDefinitionId && nextIds.has(routine.nextDefinitionId) && input.nextId !== routine.nextDefinitionId) {
      throw new WorkoutError("Keep the next workout selected while it remains in the routine.");
    }
    await tx.workoutDefinition.updateMany({
      where: { routineId: routine.id, id: { notIn: [...nextIds.values()] } }, data: { archived: true },
    });
    await tx.workoutRoutine.update({ where: { id: routine.id }, data: {
      name: input.name, nextDefinitionId: nextIds.get(input.nextId)!, revision: { increment: 1 },
    } });
  });
}

export async function endEntry(userId: string, logId: string, entryId: string, discard: boolean) {
  return prisma.$transaction(async (tx) => {
    const routine = await lockWorkoutContext(tx, userId, logId);
    const entry = await tx.workoutEntry.findFirst({ where: { id: entryId, userId, logId, routineId: routine?.id ?? "" } });
    if (!routine || !entry) throw new WorkoutError("Workout not found.");
    const target = discard ? "DISCARDED" : "COMPLETED";
    if (entry.status === target) return;
    if (entry.status !== "IN_PROGRESS") throw new WorkoutError("This workout has already ended. Reload the page.");
    if (discard) {
      await tx.weightliftingSession.updateMany({ where: { userId, logId, workoutEntryId: entry.id }, data: { workoutEntryId: null } });
    } else {
      const count = await tx.weightliftingSession.count({ where: { userId, logId, workoutEntryId: entry.id } });
      if (!count) throw new WorkoutError("Record at least one exercise session before finishing, or discard the workout.");
    }
    const position = routine.definitions.findIndex((definition) => definition.id === entry.definitionId);
    if (position < 0) throw new WorkoutError("The workout is no longer in this routine.");
    await tx.workoutEntry.update({ where: { id: entry.id }, data: { status: target, completedAt: discard ? null : new Date() } });
    await tx.workoutRoutine.update({ where: { id: routine.id }, data: {
      revision: { increment: 1 },
      ...(!discard ? { nextDefinitionId: routine.definitions[(position + 1) % routine.definitions.length].id } : {}),
    } });
  });
}

export async function resolveSessionWorkout(tx: Tx, userId: string, logId: string, routine: Context, form: FormData, date: string) {
  const selection = String(form.get("workoutSelection") ?? "standalone");
  if (selection === "standalone") return null;
  if (selection === "start") {
    const entry = await startEntry(tx, userId, logId, routine, {
      routineId: String(form.get("routineId") ?? ""), revision: Number(form.get("routineRevision")),
      nextId: String(form.get("nextDefinitionId") ?? ""), date,
      requestId: String(form.get("requestId") ?? ""),
    });
    if (entry.status !== "IN_PROGRESS") throw new WorkoutError("This workout has ended. Reload the page.");
    return entry.id;
  }
  const entry = routine?.entries.find((item) => item.id === selection);
  if (!entry || entry.userId !== userId || entry.logId !== logId || entry.performedAt.toISOString().slice(0, 10) !== date) {
    throw new WorkoutError("Choose an in-progress workout with the same date, or select Standalone.");
  }
  return entry.id;
}
