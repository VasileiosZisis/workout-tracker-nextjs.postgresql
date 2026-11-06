"use server";

import { SessionKind } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { parsePerformedDate } from "./format";
import { calculateWeightliftingMetrics } from "./metrics";
import { weightliftingSessionSchema } from "./schema";
import type { WeightliftingActionState } from "./types";
import { ZodError } from "zod";
import { lockWorkoutContext, resolveSessionWorkout, WorkoutError } from "@/features/workouts/service";
import { performedDateSchema, requestIdSchema } from "@/features/workouts/schema";
import { createHash } from "node:crypto";

function parseWeightliftingForm(formData: FormData) {
  const setCount = Number(formData.get("setCount") ?? 0);
  const sets = Array.from({ length: Math.max(0, setCount) }, (_, index) => ({
    repetitions: formData.get(`sets.${index}.repetitions`),
    kilograms: formData.get(`sets.${index}.kilograms`),
    isHard: formData.has(`sets.${index}.isHard`),
  }));

  return weightliftingSessionSchema.safeParse({
    performedDate: formData.get("performedDate"),
    sets,
  });
}

function decimalString(value: number) {
  return value.toFixed(2);
}

function getFieldErrors(parsed: ReturnType<typeof parseWeightliftingForm>) {
  if (parsed.success) {
    return undefined;
  }

  const flattened = parsed.error.flatten();

  return {
    performedDate: flattened.fieldErrors.performedDate,
    sets: flattened.fieldErrors.sets ?? flattened.formErrors,
  };
}

export async function createWeightliftingSessionAction(
  _previousState: WeightliftingActionState,
  formData: FormData,
): Promise<WeightliftingActionState> {
  const user = await requireUser();
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const parsed = parseWeightliftingForm(formData);

  if (!exerciseId) {
    return { formError: "Exercise id is missing." };
  }

  if (!parsed.success) {
    return {
      fieldErrors: getFieldErrors(parsed),
    };
  }

  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      userId: user.id,
      sessionKind: SessionKind.WEIGHTLIFTING,
    },
    include: {
      log: true,
    },
  });

  if (!exercise) {
    notFound();
  }

  const metrics = calculateWeightliftingMetrics(parsed.data.sets);

  let session: { id: string; workoutEntryId: string | null; workoutEntry: { slug: string } | null };
  let returnWorkoutEntryId: string | null = null;
  try {
  const requestId = requestIdSchema.parse(formData.get("requestId"));
  performedDateSchema.parse(parsed.data.performedDate);
  const selection = String(formData.get("workoutSelection") ?? "standalone");
  const origin = formData.get("returnWorkoutEntryId");
  if (origin !== null && (typeof origin !== "string" || !origin || origin.length > 100)) throw new WorkoutError("Invalid workout return context. Open the session form again.");
  // Immutable creation input: compare to this even if the session is later edited.
  const requestFingerprint = createHash("sha256").update(JSON.stringify({
    exerciseId: exercise.id, logId: exercise.logId, ...parsed.data, selection,
    ...(selection === "start" ? {
      routineId: String(formData.get("routineId") ?? ""),
      revision: String(formData.get("routineRevision") ?? ""),
      nextId: String(formData.get("nextDefinitionId") ?? ""),
      ...(formData.has("schedulingIntent") ? {
        intent: formData.get("schedulingIntent"), scheduleId: formData.get("scheduleId"), slotKey: formData.get("slotKey"),
        definitionId: formData.get("chosenDefinitionId"), today: formData.get("scheduleToday"),
      } : {}),
    } : {}),
  })).digest("hex");
  session = await prisma.$transaction(async (tx) => {
    const routine = await lockWorkoutContext(tx, user.id, exercise.logId);
    // Re-read under the log lock so exercise deletion/type changes cannot race.
    const currentExercise = await tx.exercise.findFirst({ where: { id: exercise.id, userId: user.id, logId: exercise.logId, sessionKind: SessionKind.WEIGHTLIFTING } });
    if (!currentExercise) throw new WorkoutError("Exercise is no longer available.");
    const previous = await tx.weightliftingSession.findUnique({ where: { userId_requestId: { userId: user.id, requestId } }, include: { workoutEntry: { select: { slug: true } } } });
    if (previous && previous.requestFingerprint !== requestFingerprint) {
      throw new WorkoutError("This form already created a session with different inputs. Reload to create another session, or edit the saved session.");
    }
    // Return navigation is deliberately separate from the immutable training
    // payload. Validate it before any writes, even for Standalone and retries.
    if (origin !== null) {
      if (selection !== origin) throw new WorkoutError("Save to the originating workout.");
      const entry = await tx.workoutEntry.findFirst({ where: {
        id: origin, userId: user.id, logId: exercise.logId, routineId: routine?.id ?? "",
        performedAt: parsePerformedDate(parsed.data.performedDate), log: { userId: user.id },
        routine: { userId: user.id, logId: exercise.logId },
        status: previous ? { in: ["IN_PROGRESS", "COMPLETED", "DISCARDED"] } : "IN_PROGRESS",
      }, select: { id: true } });
      if (!entry) throw new WorkoutError("The originating workout changed. Open the session form again.");
      if (!previous || previous.workoutEntryId === origin) returnWorkoutEntryId = origin;
    }
    if (previous) {
      return previous;
    }
    const workoutEntryId = await resolveSessionWorkout(tx, user.id, exercise.logId, routine, formData, parsed.data.performedDate);
    const createdSession = await tx.weightliftingSession.create({
      include: { workoutEntry: { select: { slug: true } } },
      data: {
        requestId,
        requestFingerprint,
        workoutEntryId,
        userId: user.id,
        logId: exercise.logId,
        exerciseId: exercise.id,
        performedAt: parsePerformedDate(parsed.data.performedDate),
        totalVolume: decimalString(metrics.totalVolume),
        junkVolume: decimalString(metrics.junkVolume),
        workingVolume: decimalString(metrics.workingVolume),
      },
    });

    await tx.weightliftingSet.createMany({
      data: metrics.sets.map((set) => ({
        sessionId: createdSession.id,
        position: set.position,
        repetitions: decimalString(set.repetitions),
        kilograms: decimalString(set.kilograms),
        isHard: set.isHard,
        volume: decimalString(set.volume),
      })),
    });

    return createdSession;
  }, { timeout: 30000 });
  } catch (error) {
    if (error instanceof WorkoutError) return { fieldErrors: { workoutSelection: [error.message] } };
    if (error instanceof ZodError) return { formError: error.issues[0]?.message ?? "Check the session details." };
    throw error;
  }

  const exercisePath = `/logs/${exercise.log.slug}/exercises/${exercise.slug}`;

  revalidatePath(exercisePath);
  revalidatePath(`/logs/${exercise.log.slug}`);
  revalidatePath(`/routine/${exercise.log.slug}`);
  revalidatePath(`/routine/${exercise.log.slug}/edit`);
  if (session.workoutEntry) revalidatePath(`/logs/${exercise.log.slug}/workouts/${session.workoutEntry.slug}`);
  revalidatePath(`/logs/${exercise.log.slug}/workouts`);
  if (session.workoutEntry && returnWorkoutEntryId && session.workoutEntryId === returnWorkoutEntryId) redirect(`/logs/${exercise.log.slug}/workouts/${session.workoutEntry.slug}`);
  redirect(`${exercisePath}/weightlifting/${session.id}`);
}

export async function updateWeightliftingSessionAction(
  _previousState: WeightliftingActionState,
  formData: FormData,
): Promise<WeightliftingActionState> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const parsed = parseWeightliftingForm(formData);

  if (!sessionId) {
    return { formError: "Session id is missing." };
  }

  if (!parsed.success) {
    return {
      fieldErrors: getFieldErrors(parsed),
    };
  }

  const existingSession = await prisma.weightliftingSession.findFirst({
    where: {
      id: sessionId,
      userId: user.id,
      exercise: {
        sessionKind: SessionKind.WEIGHTLIFTING,
      },
    },
    include: {
      exercise: {
        include: {
          log: true,
        },
      },
    },
  });

  if (!existingSession) {
    notFound();
  }

  const metrics = calculateWeightliftingMetrics(parsed.data.sets);

  const origin = formData.get("returnWorkoutEntryId");
  let workoutSlug: string | undefined;
  try {
  performedDateSchema.parse(parsed.data.performedDate);
  workoutSlug = await prisma.$transaction(async (tx) => {
    await lockWorkoutContext(tx, user.id, existingSession.logId);
    const current = await tx.weightliftingSession.findFirst({ where: { id: existingSession.id, userId: user.id, logId: existingSession.logId, exercise: { userId: user.id, sessionKind: SessionKind.WEIGHTLIFTING } }, include: { workoutEntry: true } });
    if (!current) throw new WorkoutError("Session no longer exists.");
    const selection = String(formData.get("workoutSelection") ?? current.workoutEntryId ?? "standalone");
    if (origin !== null && (typeof origin !== "string" || origin !== selection || origin !== current.workoutEntryId || current.workoutEntry?.status !== "IN_PROGRESS" || current.workoutEntry.performedAt.toISOString().slice(0, 10) !== parsed.data.performedDate)) {
      throw new WorkoutError("The originating workout or date changed. Open the session from the workout again.");
    }
    if (selection !== "standalone" && selection !== current.workoutEntryId) throw new WorkoutError("Moving sessions between workouts is not available yet. Choose Standalone to detach.");
    if (selection !== "standalone" && current.workoutEntry && (
      current.workoutEntry.userId !== user.id || current.workoutEntry.logId !== current.logId ||
      current.workoutEntry.performedAt.toISOString().slice(0, 10) !== parsed.data.performedDate
    )) throw new WorkoutError("Select Standalone before changing the date of a linked session.");
    await tx.weightliftingSession.update({
      where: { id: existingSession.id },
      data: {
        workoutEntryId: selection === "standalone" ? null : current.workoutEntryId,
        performedAt: parsePerformedDate(parsed.data.performedDate),
        totalVolume: decimalString(metrics.totalVolume),
        junkVolume: decimalString(metrics.junkVolume),
        workingVolume: decimalString(metrics.workingVolume),
      },
    });

    await tx.weightliftingSet.deleteMany({
      where: { sessionId: existingSession.id },
    });

    await tx.weightliftingSet.createMany({
      data: metrics.sets.map((set) => ({
        sessionId: existingSession.id,
        position: set.position,
        repetitions: decimalString(set.repetitions),
        kilograms: decimalString(set.kilograms),
        isHard: set.isHard,
        volume: decimalString(set.volume),
      })),
    });
    return origin !== null ? current.workoutEntry?.slug : undefined;
  });
  } catch (error) {
    if (error instanceof WorkoutError) return { fieldErrors: { workoutSelection: [error.message] } };
    if (error instanceof ZodError) return { formError: error.issues[0]?.message ?? "Check the session details." };
    throw error;
  }

  const exercisePath = `/logs/${existingSession.exercise.log.slug}/exercises/${existingSession.exercise.slug}`;

  revalidatePath(exercisePath);
  revalidatePath(`/logs/${existingSession.exercise.log.slug}`, "layout");
  revalidatePath(`${exercisePath}/weightlifting/${existingSession.id}`);
  revalidatePath(`${exercisePath}/weightlifting/${existingSession.id}/edit`);
  redirect(workoutSlug ? `/logs/${existingSession.exercise.log.slug}/workouts/${workoutSlug}` : `${exercisePath}/weightlifting/${existingSession.id}`);
}

export async function deleteWeightliftingSessionAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    notFound();
  }

  const session = await prisma.weightliftingSession.findFirst({
    where: {
      id: sessionId,
      userId: user.id,
      exercise: {
        sessionKind: SessionKind.WEIGHTLIFTING,
      },
    },
    include: {
      exercise: {
        include: {
          log: true,
        },
      },
    },
  });

  if (!session) {
    notFound();
  }

  await prisma.$transaction(async (tx) => {
    await lockWorkoutContext(tx, user.id, session.logId);
    await tx.weightliftingSession.deleteMany({ where: { id: session.id, userId: user.id, logId: session.logId } });
  });

  const exercisePath = `/logs/${session.exercise.log.slug}/exercises/${session.exercise.slug}`;

  revalidatePath(exercisePath);
  revalidatePath(`/logs/${session.exercise.log.slug}`, "layout");
  redirect(exercisePath);
}
