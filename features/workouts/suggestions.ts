import { prisma } from "@/lib/db";
import { z } from "zod";
import { lockWorkoutContext, WorkoutError } from "./service";

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

export async function changeWorkoutSuggestions(userId: string, logId: string, raw: unknown) {
  const input = suggestionChangeSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const routine = await lockWorkoutContext(tx, userId, logId);
    if (!routine || routine.id !== input.routineId || routine.revision !== input.revision) {
      throw new WorkoutError("The routine changed. Reload before editing exercises.");
    }
    if (routine.entries.length) throw new WorkoutError("Finish or discard the active workout before editing exercises.");
    if (!routine.definitions.some((definition) => definition.id === input.definitionId)) {
      throw new WorkoutError("Workout not found in this routine.");
    }
    const current = await tx.workoutExercise.findMany({ where: { definitionId: input.definitionId }, select: { id: true } });
    const currentIds = new Set(current.map((suggestion) => suggestion.id));
    if (input.change.operation === "removeExercise") {
      if (!currentIds.has(input.change.suggestionId)) throw new WorkoutError("Workout exercise not found. Reload the page.");
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
