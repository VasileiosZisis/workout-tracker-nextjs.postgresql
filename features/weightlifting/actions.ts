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

  const session = await prisma.$transaction(async (tx) => {
    const createdSession = await tx.weightliftingSession.create({
      data: {
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
  });

  const exercisePath = `/logs/${exercise.log.slug}/exercises/${exercise.slug}`;

  revalidatePath(exercisePath);
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

  await prisma.$transaction(async (tx) => {
    await tx.weightliftingSession.update({
      where: { id: existingSession.id },
      data: {
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
  });

  const exercisePath = `/logs/${existingSession.exercise.log.slug}/exercises/${existingSession.exercise.slug}`;

  revalidatePath(exercisePath);
  revalidatePath(`${exercisePath}/weightlifting/${existingSession.id}`);
  revalidatePath(`${exercisePath}/weightlifting/${existingSession.id}/edit`);
  redirect(`${exercisePath}/weightlifting/${existingSession.id}`);
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

  await prisma.weightliftingSession.delete({
    where: { id: session.id },
  });

  const exercisePath = `/logs/${session.exercise.log.slug}/exercises/${session.exercise.slug}`;

  revalidatePath(exercisePath);
  redirect(exercisePath);
}
