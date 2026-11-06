import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestIdSchema } from "./schema";
import { lockWorkoutContext, WorkoutError } from "./service";
import { captureEntryExercises } from "./entry-exercise-plan";

const id = z.string().min(1).max(100);
export const entryExerciseChangeSchema = z.object({
  entryId: id, expectedRevision: z.number().int().min(0).nullable(), requestId: requestIdSchema,
  exerciseId: id,
  change: z.discriminatedUnion("operation", [z.object({ operation: z.literal("add") }), z.object({ operation: z.literal("replace"), originalExerciseId: id })]),
});
export type EntryExerciseChange = z.infer<typeof entryExerciseChangeSchema>;

export async function changeEntryExercise(userId: string, logId: string, raw: unknown) {
  const input = entryExerciseChangeSchema.parse(raw);
  const fingerprint = createHash("sha256").update(JSON.stringify({ logId, ...input })).digest("hex");
  return prisma.$transaction(async (tx) => {
    const routine = await lockWorkoutContext(tx, userId, logId);
    const entry = await tx.workoutEntry.findFirst({ where: { id: input.entryId, userId, logId, routineId: routine?.id ?? "", routine: { userId, logId } } });
    if (!routine || !entry) throw new WorkoutError("Workout not found.");
    const prior = await tx.workoutScheduleRequest.findUnique({ where: { userId_requestId: { userId, requestId: input.requestId } } });
    if (prior) {
      if (prior.routineId !== routine.id || prior.operation !== "ENTRY_EXERCISE" || prior.fingerprint !== fingerprint) throw new WorkoutError("This request was already used for different inputs. Reload the workout.");
      return { entryId: entry.id, entrySlug: entry.slug, exerciseSlug: null };
    }
    if (entry.status !== "IN_PROGRESS") throw new WorkoutError("This workout has ended. Reload the page.");
    if (entry.exercisePlanRevision !== input.expectedRevision) throw new WorkoutError("The workout exercises changed. Reload before trying again.");
    const exercise = await tx.exercise.findFirst({ where: { id: input.exerciseId, userId, logId, sessionKind: "WEIGHTLIFTING", log: { userId } }, select: { id: true, slug: true } });
    if (!exercise) throw new WorkoutError("Choose an available weightlifting exercise from this log.");
    if (entry.exercisePlanRevision === null) await captureEntryExercises(tx, userId, logId, entry.id, entry.definitionId);
    const planned = await tx.workoutEntryExercise.findMany({ where: { entryId: entry.id }, orderBy: [{ position: "asc" }, { id: "asc" }] });
    if (planned.some((item) => item.exerciseId === exercise.id)) throw new WorkoutError("This exercise is already in the workout.");
    if (input.change.operation === "replace") {
      const originalId = input.change.originalExerciseId;
      const original = planned.find((item) => item.exerciseId === originalId);
      if (!original) throw new WorkoutError("The original exercise changed. Reload the workout.");
      await tx.workoutEntryExercise.update({ where: { id: original.id }, data: { exerciseId: exercise.id } });
    } else {
      await tx.workoutEntryExercise.create({ data: { entryId: entry.id, exerciseId: exercise.id, position: (planned.at(-1)?.position ?? -1) + 1 } });
    }
    await tx.workoutEntry.update({ where: { id: entry.id }, data: { exercisePlanRevision: { increment: 1 } } });
    await tx.workoutScheduleRequest.create({ data: { userId, routineId: routine.id, requestId: input.requestId, fingerprint, operation: "ENTRY_EXERCISE" } });
    return { entryId: entry.id, entrySlug: entry.slug, exerciseSlug: exercise.slug };
  }, { timeout: 30000 }).catch((error: unknown) => {
    // Different logs have separate locks but share the owner's request ledger.
    // A concurrent changed-input replay must still be a recoverable conflict.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new WorkoutError("The workout changed or this request was already used. Reload before trying again.");
    throw error;
  });
}
