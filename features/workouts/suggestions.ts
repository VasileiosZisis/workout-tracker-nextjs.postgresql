import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { lockWorkoutContext, WorkoutError } from "./service";

type Tx = Prisma.TransactionClient;
const idSchema = z.string().min(1).max(100);
export const suggestionChangeSchema = z.object({
  routineId: idSchema,
  revision: z.coerce.number().int().min(0),
  definitionId: idSchema,
  change: z.discriminatedUnion("operation", [
    z.object({ operation: z.literal("removeExercise"), suggestionId: idSchema }),
    z.object({ operation: z.literal("reorderExercises"), order: z.array(idSchema) }),
  ]),
});

// Caller holds the log/routine locks and has validated the exercise. Only call
// for a newly inserted session; retries and edits must never re-learn removals.
export async function rememberWorkoutExercise(tx: Tx, userId: string, logId: string, entryId: string, exerciseId: string) {
  const entry = await tx.workoutEntry.findFirst({
    where: { id: entryId, userId, logId, status: "IN_PROGRESS", definition: { routine: { userId, logId } }, OR: [{ definition: { archived: false } }, { scheduleId: { not: null } }] },
    select: { definitionId: true, routineId: true },
  });
  if (!entry) throw new WorkoutError("The active workout changed. Reload before saving.");
  const existing = await tx.workoutExercise.findUnique({
    where: { definitionId_exerciseId: { definitionId: entry.definitionId, exerciseId } },
    select: { id: true },
  });
  if (existing) return;
  const last = await tx.workoutExercise.aggregate({ where: { definitionId: entry.definitionId }, _max: { position: true } });
  await tx.workoutExercise.create({ data: { definitionId: entry.definitionId, exerciseId, position: (last._max.position ?? -1) + 1 } });
  await tx.workoutRoutine.update({ where: { id: entry.routineId }, data: { revision: { increment: 1 } } });
}

export async function changeWorkoutSuggestions(userId: string, logId: string, raw: unknown) {
  const input = suggestionChangeSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const routine = await lockWorkoutContext(tx, userId, logId);
    if (!routine || routine.id !== input.routineId || routine.revision !== input.revision) {
      throw new WorkoutError("The routine changed. Reload before editing suggestions.");
    }
    if (routine.entries.length) throw new WorkoutError("Finish or discard the active workout before editing suggestions.");
    if (!routine.definitions.some((definition) => definition.id === input.definitionId)) {
      throw new WorkoutError("Workout not found in this routine.");
    }
    const current = await tx.workoutExercise.findMany({ where: { definitionId: input.definitionId }, select: { id: true } });
    const currentIds = new Set(current.map((suggestion) => suggestion.id));
    if (input.change.operation === "removeExercise") {
      if (!currentIds.has(input.change.suggestionId)) throw new WorkoutError("Suggestion not found. Reload the page.");
      await tx.workoutExercise.delete({ where: { id: input.change.suggestionId } });
    } else {
      const order = input.change.order;
      if (order.length !== current.length || new Set(order).size !== order.length || order.some((id) => !currentIds.has(id))) {
        throw new WorkoutError("The exercise list changed. Reload before reordering.");
      }
      for (const [position, id] of order.entries()) {
        await tx.workoutExercise.update({ where: { id }, data: { position } });
      }
    }
    await tx.workoutRoutine.update({ where: { id: routine.id }, data: { revision: { increment: 1 } } });
  });
}
