"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { exerciseFormSchema } from "./schema";
import { createUniqueExerciseSlug, slugifyExerciseTitle } from "./slug";
import type { ExerciseActionState } from "./types";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { lockWorkoutContext, WorkoutError } from "@/features/workouts/service";
import { removeExerciseFromEntryPlans } from "@/features/workouts/entry-exercise-plan";

function parseExerciseForm(formData: FormData) {
  return exerciseFormSchema.safeParse({
    title: formData.get("title"),
    sessionKind: formData.get("sessionKind"),
  });
}

export async function createExerciseAction(
  _previousState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const user = await requireUser();
  const logId = String(formData.get("logId") ?? "");
  const parsed = parseExerciseForm(formData);

  if (!logId) {
    return { formError: "Log id is missing." };
  }

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const baseSlug = slugifyExerciseTitle(parsed.data.title);
  const [log, existingSlugs] = await Promise.all([
    prisma.log.findFirst({
      where: {
        id: logId,
        userId: user.id,
      },
    }),
    prisma.exercise.findMany({
      where: {
        userId: user.id,
        logId,
      },
      select: { slug: true },
    }),
  ]);

  if (!log) {
    notFound();
  }

  const slug = createUniqueExerciseSlug(
    baseSlug,
    existingSlugs.map((exercise) => exercise.slug),
  );

  const exercise = await prisma.exercise.create({
    data: {
      title: parsed.data.title,
      slug,
      sessionKind: parsed.data.sessionKind,
      userId: user.id,
      logId: log.id,
    },
  });

  revalidatePath(`/logs/${log.slug}`);
  redirect(`/logs/${log.slug}/exercises/${exercise.slug}`);
}

export async function updateExerciseAction(
  _previousState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const user = await requireUser();
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const parsed = parseExerciseForm(formData);

  if (!exerciseId) {
    return { formError: "Exercise id is missing." };
  }

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingExercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      userId: user.id,
    },
    include: {
      log: true,
      _count: {
        select: {
          intervalSessions: true,
          paceSessions: true,
          weightliftingSessions: true,
        },
      },
    },
  });

  if (!existingExercise) {
    notFound();
  }

  const sessionKindLocked =
    existingExercise._count.intervalSessions > 0 ||
    existingExercise._count.paceSessions > 0 ||
    existingExercise._count.weightliftingSessions > 0;

  if (
    sessionKindLocked &&
    parsed.data.sessionKind !== existingExercise.sessionKind
  ) {
    return {
      fieldErrors: {
        sessionKind: [
          "Session type cannot be changed after sessions have been added.",
        ],
      },
    };
  }

  const nextSlug = slugifyExerciseTitle(parsed.data.title);
  const conflictingExercise = await prisma.exercise.findUnique({
    where: {
      logId_slug: {
        logId: existingExercise.logId,
        slug: nextSlug,
      },
    },
  });

  const slug =
    conflictingExercise && conflictingExercise.id !== existingExercise.id
      ? existingExercise.slug
      : nextSlug;

  let exercise;
  try {
    exercise = await prisma.$transaction(async (tx) => {
      await lockWorkoutContext(tx, user.id, existingExercise.logId);
      const current = await tx.exercise.findFirst({
        where: { id: existingExercise.id, userId: user.id, logId: existingExercise.logId },
        include: { _count: { select: { intervalSessions: true, paceSessions: true, weightliftingSessions: true } } },
      });
      if (!current) throw new WorkoutError("Exercise no longer exists.");
      if (parsed.data.sessionKind !== current.sessionKind) {
        if (current._count.intervalSessions || current._count.paceSessions || current._count.weightliftingSessions) {
          throw new WorkoutError("Session type cannot be changed after sessions have been added.");
        }
        if (parsed.data.sessionKind !== "WEIGHTLIFTING") {
          await removeExerciseFromEntryPlans(tx, user.id, current.logId, current.id);
          const removed = await tx.workoutExercise.deleteMany({ where: { exerciseId: current.id, definition: { routine: { userId: user.id, logId: current.logId } } } });
          if (removed.count) await tx.workoutRoutine.updateMany({ where: { userId: user.id, logId: current.logId }, data: { revision: { increment: 1 } } });
        }
      }
      return tx.exercise.update({
        where: { id: existingExercise.id, userId: user.id },
        data: { title: parsed.data.title, slug, sessionKind: parsed.data.sessionKind },
      });
    }, { timeout: 30000 });
  } catch (error) {
    if (error instanceof WorkoutError) return { formError: error.message };
    throw error;
  }

  revalidatePath(`/logs/${existingExercise.log.slug}`, "layout");
  revalidatePath(`/routine/${existingExercise.log.slug}`);
  revalidatePath(`/routine/${existingExercise.log.slug}/edit`);
  revalidatePath(`/logs/${existingExercise.log.slug}/exercises/${existingExercise.slug}`);
  revalidatePath(`/logs/${existingExercise.log.slug}/exercises/${existingExercise.slug}/edit`);
  redirect(`/logs/${existingExercise.log.slug}/exercises/${exercise.slug}`);
}

export async function deleteExerciseAction(formData: FormData) {
  const user = await requireUser();
  const exerciseId = String(formData.get("exerciseId") ?? "");

  if (!exerciseId) {
    notFound();
  }

  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      userId: user.id,
    },
    include: {
      log: true,
    },
  });

  if (!exercise) {
    notFound();
  }

  await prisma.$transaction(async (tx) => {
    await lockWorkoutContext(tx, user.id, exercise.logId);
    await removeExerciseFromEntryPlans(tx, user.id, exercise.logId, exercise.id);
    const remembered = await tx.workoutExercise.count({ where: { exerciseId: exercise.id, definition: { routine: { userId: user.id, logId: exercise.logId } } } });
    if (remembered) await tx.workoutRoutine.updateMany({ where: { userId: user.id, logId: exercise.logId }, data: { revision: { increment: 1 } } });
    await tx.exercise.deleteMany({ where: { id: exercise.id, userId: user.id, logId: exercise.logId } });
  }, { timeout: 30000 });

  revalidatePath(`/logs/${exercise.log.slug}`, "layout");
  revalidatePath(`/routine/${exercise.log.slug}`);
  revalidatePath(`/routine/${exercise.log.slug}/edit`);
  redirect(`/logs/${exercise.log.slug}`);
}
