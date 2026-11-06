import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { createUniqueExerciseSlug, slugifyExerciseTitle } from "@/features/exercises/slug";
import { localDate } from "./calendar";
import { currentSchedule } from "./scheduling";
import { lockWorkoutContext, WorkoutError } from "./service";
import { assignmentSaveSchema, routineSetupSchema } from "./setup-schema";

type Tx = Prisma.TransactionClient;
async function resolveExercises(tx: Tx, userId: string, logId: string, selected: string[], drafts: { id: string; title: string }[]) {
  const distinct = [...new Set(selected)];
  const inline = new Map(drafts.map((item) => [item.id, item]));
  const existingIds = distinct.filter((id) => !inline.has(id));
  const existing = await tx.exercise.findMany({ where: { id: { in: existingIds }, userId, logId, sessionKind: "WEIGHTLIFTING" }, select: { id: true } });
  if (existing.length !== existingIds.length) throw new WorkoutError("An exercise is unavailable. Choose weightlifting exercises from this log.");
  const resolved = new Map(existing.map((item) => [item.id, item.id]));
  const slugs = await tx.exercise.findMany({ where: { userId, logId }, select: { slug: true } });
  const usedSlugs = slugs.map((item) => item.slug);
  for (const ref of distinct) {
    const draft = inline.get(ref);
    if (!draft) continue;
    const slug = createUniqueExerciseSlug(slugifyExerciseTitle(draft.title), usedSlugs);
    const created = await tx.exercise.create({ data: { userId, logId, title: draft.title, slug, sessionKind: "WEIGHTLIFTING" }, select: { id: true } });
    usedSlugs.push(slug); resolved.set(ref, created.id);
  }
  return resolved;
}

// Call only while holding the owned Log -> Routine locks. Retained IDs survive
// reordering; session associations, sets, schedule slots and metrics are untouched.
async function writeAssignments(tx: Tx, definitionId: string, exerciseIds: string[]) {
  await tx.workoutExercise.deleteMany({ where: { definitionId, exerciseId: { notIn: exerciseIds } } });
  for (const [position, exerciseId] of exerciseIds.entries()) await tx.workoutExercise.upsert({
    where: { definitionId_exerciseId: { definitionId, exerciseId } },
    create: { definitionId, exerciseId, position }, update: { position },
  });
}
function translateCollision(error: unknown): never {
  if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new WorkoutError("The exercise library or routine changed. Reload and try again; nothing was saved.");
  throw error;
}

export async function createRoutineFromSetup(userId: string, logId: string, raw: unknown, now = new Date()) {
  const input = routineSetupSchema.parse(raw);
  const fingerprint = createHash("sha256").update(JSON.stringify({ logId, ...input, newExercises: [...input.newExercises].sort((a, b) => a.id.localeCompare(b.id)), assignments: input.style === "FIXED" ? [...input.assignments].sort((a, b) => a.weekday - b.weekday) : [] })).digest("hex");
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await lockWorkoutContext(tx, userId, logId);
      const prior = await tx.workoutScheduleRequest.findUnique({ where: { userId_requestId: { userId, requestId: input.requestId } } });
      if (prior) {
        if (prior.operation !== "SETUP" || prior.fingerprint !== fingerprint || prior.routineId !== current?.id) throw new WorkoutError("This setup request was already used for different inputs. Reload the Routine page.");
        return { routineId: prior.routineId };
      }
      if (current) throw new WorkoutError("A routine already exists for this log. Reload to edit it.");
      if (input.today !== localDate(now, input.timezone)) throw new WorkoutError("The setup date changed. Review the effective date and save again.");
      const exercises = await resolveExercises(tx, userId, logId, input.workouts.flatMap((item) => item.exerciseIds), input.newExercises);
      const routine = await tx.workoutRoutine.create({ data: { userId, logId, name: input.name, revision: 1 } });
      const definitions = new Map<string, { id: string; name: string }>();
      for (const [position, workout] of input.workouts.entries()) {
        const definition = await tx.workoutDefinition.create({ data: { routineId: routine.id, name: workout.name, position } });
        definitions.set(workout.id, definition);
        await writeAssignments(tx, definition.id, workout.exerciseIds.map((ref) => exercises.get(ref)!));
      }
      await tx.workoutRoutine.update({ where: { id: routine.id }, data: { nextDefinitionId: definitions.get(input.nextId)!.id } });
      const workouts = input.style === "FIXED" ? input.assignments.map((item) => ({ definitionId: definitions.get(item.definitionId)!.id, name: definitions.get(item.definitionId)!.name, weekday: item.weekday }))
        : input.workouts.map((item) => ({ definitionId: definitions.get(item.id)!.id, name: item.name }));
      await tx.workoutSchedule.create({ data: { routineId: routine.id, style: input.style, timezone: input.timezone, weekStart: input.weekStart, startDate: input.today, effectiveAt: now, workouts } });
      await tx.workoutScheduleRequest.create({ data: { routineId: routine.id, userId, requestId: input.requestId, fingerprint, operation: "SETUP" } });
      return { routineId: routine.id };
    }, { timeout: 30000 });
  } catch (error) { return translateCollision(error); }
}

export async function saveWorkoutAssignments(userId: string, logId: string, raw: unknown, now = new Date()) {
  const input = assignmentSaveSchema.parse(raw);
  try {
    return await prisma.$transaction(async (tx) => {
      const routine = await lockWorkoutContext(tx, userId, logId);
      if (!routine || routine.id !== input.routineId || routine.revision !== input.revision) throw new WorkoutError("The routine changed. Reload before editing exercises.");
      if (routine.entries.length) throw new WorkoutError("Finish or discard the active workout before editing exercises.");
      if (!routine.definitions.some((item) => item.id === input.definitionId)) throw new WorkoutError("Choose a current workout in this routine.");
      const schedule = await currentSchedule(tx, routine.id, now);
      if ((schedule?.id ?? "") !== input.expectedScheduleId || localDate(now, schedule?.timezone ?? "UTC") !== input.expectedToday) throw new WorkoutError("The schedule date changed. Reload before saving exercises.");
      const resolved = await resolveExercises(tx, userId, logId, input.exerciseIds, input.newExercises);
      await writeAssignments(tx, input.definitionId, input.exerciseIds.map((id) => resolved.get(id)!));
      await tx.workoutRoutine.update({ where: { id: routine.id }, data: { revision: { increment: 1 } } });
    }, { timeout: 30000 });
  } catch (error) { return translateCollision(error); }
}
