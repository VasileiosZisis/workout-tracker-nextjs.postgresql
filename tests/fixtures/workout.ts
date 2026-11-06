import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

// Build prerequisite data directly. Tests of setup/saveRoutine still invoke the
// real workflows; other suites need not exercise those workflows in every hook.
// Each test owns its user/log; afterEach's user cascade cleans partial fixtures.
export async function createWorkoutFixture(userId: string, logId: string,
  workouts: { name: string; exerciseIds?: string[] }[]) {
  const routineId = randomUUID(), definitionIds = workouts.map(() => randomUUID());
  await prisma.workoutRoutine.create({ data: { id: routineId, userId, logId, name: "Split", revision: 1 } });
  await prisma.workoutDefinition.createMany({ data: workouts.map((workout, position) => ({ id: definitionIds[position], routineId, name: workout.name, position })) });
  await prisma.workoutRoutine.update({ where: { id: routineId }, data: { nextDefinitionId: definitionIds[0] } });
  const assignments = workouts.flatMap((workout, index) => (workout.exerciseIds ?? []).map((exerciseId, position) => ({ definitionId: definitionIds[index], exerciseId, position })));
  if (assignments.length) await prisma.workoutExercise.createMany({ data: assignments });
  return { routineId, definitionIds };
}
