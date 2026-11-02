import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { performedDateSchema, requestIdSchema } from "./schema";
import { lockWorkoutContext, WorkoutError } from "./service";
import { claimEntrySlot, historicalSlotData } from "./scheduling";

const id = z.string().min(1).max(100);
export const historicalWorkoutSchema = z.object({
  routineId: id,
  revision: z.coerce.number().int().min(0),
  definitionId: id,
  performedDate: performedDateSchema,
  requestId: requestIdSchema,
  sessionIds: z.array(id).min(1, "Select at least one standalone session.").max(48),
  scheduleId: z.string().max(100).default(""), slotKey: z.string().max(100).default(""),
}).refine((input) => new Set(input.sessionIds).size === input.sessionIds.length, "Select each session only once.");

export const reassignmentSchema = z.object({
  routineId: id,
  sessionId: id,
  expectedEntryId: z.string().max(100), // Empty means standalone.
  expectedUpdatedAt: z.iso.datetime(),
  targetEntryId: z.string().max(100), // Empty means standalone.
});

export async function createHistoricalWorkout(userId: string, logId: string, raw: unknown, now = new Date()) {
  const input = historicalWorkoutSchema.parse(raw);
  const fingerprint = createHash("sha256").update(JSON.stringify({
    routineId: input.routineId, definitionId: input.definitionId, performedDate: input.performedDate,
    sessionIds: [...input.sessionIds].sort(),
    ...(input.scheduleId || input.slotKey ? { scheduleId: input.scheduleId, slotKey: input.slotKey } : {}),
  })).digest("hex");
  return prisma.$transaction(async (tx) => {
    const routine = await lockWorkoutContext(tx, userId, logId);
    const previous = await tx.workoutEntry.findUnique({ where: { userId_requestId: { userId, requestId: input.requestId } } });
    if (previous) {
      if (previous.logId !== logId || previous.requestFingerprint !== fingerprint) {
        throw new WorkoutError("This form already created a workout with different inputs. Reload to group other sessions.");
      }
      return previous;
    }
    if (!routine || routine.id !== input.routineId || routine.revision !== input.revision) {
      throw new WorkoutError("The routine changed. Reload before grouping sessions.");
    }
    const definition = routine.definitions.find((item) => item.id === input.definitionId);
    if (!definition) throw new WorkoutError("Choose a current workout definition.");
    const performedAt = new Date(`${input.performedDate}T00:00:00.000Z`);
    const where = {
      id: { in: input.sessionIds }, userId, logId, performedAt, workoutEntryId: null,
      exercise: { userId, logId, sessionKind: "WEIGHTLIFTING" as const },
    };
    if (await tx.weightliftingSession.count({ where }) !== input.sessionIds.length) {
      throw new WorkoutError("Choose standalone sessions from this log on the selected date. The session list may have changed.");
    }
    if (!!input.scheduleId !== !!input.slotKey) throw new WorkoutError("Choose a complete scheduled-slot selection.");
    const scheduling = input.scheduleId ? await historicalSlotData(tx, routine, input.scheduleId, input.slotKey, input.performedDate, now) : { schedulingIntent: "HISTORICAL" };
    const entry = await tx.workoutEntry.create({ data: {
      ...scheduling,
      userId, logId, routineId: routine.id, definitionId: definition.id, name: definition.name,
      performedAt, status: "COMPLETED", completedAt: now, requestId: input.requestId,
      requestFingerprint: fingerprint,
    } });
    await claimEntrySlot(tx, routine, entry, true, now);
    const attached = await tx.weightliftingSession.updateMany({ where, data: { workoutEntryId: entry.id } });
    if (attached.count !== input.sessionIds.length) throw new WorkoutError("The selected sessions changed. Reload and try again.");
    await tx.workoutRoutine.update({ where: { id: routine.id }, data: { revision: { increment: 1 } } });
    return entry;
  });
}

export async function reassignWorkoutSession(userId: string, logId: string, raw: unknown) {
  const input = reassignmentSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const routine = await lockWorkoutContext(tx, userId, logId);
    if (!routine || routine.id !== input.routineId) throw new WorkoutError("The routine changed. Reload before correcting this session.");
    const session = await tx.weightliftingSession.findFirst({
      where: { id: input.sessionId, userId, logId, exercise: { userId, logId, sessionKind: "WEIGHTLIFTING" } },
      include: { exercise: { select: { slug: true } }, workoutEntry: true },
    });
    if (!session) throw new WorkoutError("Session not found.");
    if ((session.workoutEntryId ?? "") !== input.expectedEntryId || session.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new WorkoutError("This session changed. Reload before correcting its workout.");
    }
    if (session.workoutEntry && (session.workoutEntry.userId !== userId || session.workoutEntry.logId !== logId || session.workoutEntry.routineId !== routine.id || session.workoutEntry.status === "DISCARDED")) {
      throw new WorkoutError("The session's current workout is no longer available.");
    }
    if (input.targetEntryId) {
      const target = await tx.workoutEntry.findFirst({ where: {
        id: input.targetEntryId, userId, logId, routineId: routine.id,
        status: { in: ["IN_PROGRESS", "COMPLETED"] }, performedAt: session.performedAt,
      } });
      if (!target) throw new WorkoutError("Choose an active or completed workout in this log on the session's date.");
    }
    if (input.targetEntryId === input.expectedEntryId) return session;
    await tx.weightliftingSession.update({ where: { id: session.id }, data: { workoutEntryId: input.targetEntryId || null } });
    await tx.workoutRoutine.update({ where: { id: routine.id }, data: { revision: { increment: 1 } } });
    return session;
  });
}
