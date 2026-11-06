import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

// The caller holds Log -> Routine locks. Never run this on an initialized plan
// or a Start retry: a captured list belongs to the entry for its whole lifetime.
export async function captureEntryExercises(tx: Tx, userId: string, logId: string, entryId: string, definitionId: string) {
  const assignments = await tx.workoutExercise.findMany({
    where: { definitionId, definition: { routine: { userId, logId } }, exercise: { userId, logId, sessionKind: "WEIGHTLIFTING" } },
    orderBy: [{ position: "asc" }, { id: "asc" }], select: { exerciseId: true },
  });
  if (assignments.length) await tx.workoutEntryExercise.createMany({ data: assignments.map(({ exerciseId }, position) => ({ entryId, exerciseId, position })) });
  await tx.workoutEntry.update({ where: { id: entryId, userId, logId }, data: { exercisePlanRevision: 0 } });
}

// Run before removing definition assignments or deleting/changing the exercise.
// Capture legacy active entries first so stale null-revision forms also conflict.
export async function removeExerciseFromEntryPlans(tx: Tx, userId: string, logId: string, exerciseId: string) {
  const legacy = await tx.workoutEntry.findMany({ where: { userId, logId, routine: { userId, logId }, status: "IN_PROGRESS", exercisePlanRevision: null,
    definition: { exercises: { some: { exerciseId } } } }, select: { id: true, definitionId: true } });
  for (const entry of legacy) await captureEntryExercises(tx, userId, logId, entry.id, entry.definitionId);
  const affected = await tx.workoutEntryExercise.findMany({ where: { exerciseId, entry: { userId, logId, routine: { userId, logId } } }, select: { entryId: true } });
  if (!affected.length) return;
  await tx.workoutEntry.updateMany({ where: { id: { in: affected.map((item) => item.entryId) }, userId, logId, exercisePlanRevision: { not: null } }, data: { exercisePlanRevision: { increment: 1 } } });
  await tx.workoutEntryExercise.deleteMany({ where: { exerciseId, entry: { userId, logId, routine: { userId, logId } } } });
}
