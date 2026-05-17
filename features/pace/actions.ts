"use server";

import { SessionKind } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { parsePerformedDate } from "./format";
import { calculatePaceMetrics } from "./metrics";
import { paceSessionSchema } from "./schema";
import type { PaceActionState } from "./types";

function parsePaceForm(formData: FormData) {
  return paceSessionSchema.safeParse({
    performedDate: formData.get("performedDate"),
    hours: formData.get("hours"),
    minutes: formData.get("minutes"),
    seconds: formData.get("seconds"),
    distance: formData.get("distance"),
  });
}

function decimalString(value: number, digits = 3) {
  return value.toFixed(digits);
}

function getFieldErrors(parsed: ReturnType<typeof parsePaceForm>) {
  if (parsed.success) {
    return undefined;
  }

  return parsed.error.flatten().fieldErrors;
}

export async function createPaceSessionAction(
  _previousState: PaceActionState,
  formData: FormData,
): Promise<PaceActionState> {
  const user = await requireUser();
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const parsed = parsePaceForm(formData);

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
      sessionKind: SessionKind.PACE,
    },
    include: {
      log: true,
    },
  });

  if (!exercise) {
    notFound();
  }

  const metrics = calculatePaceMetrics(parsed.data);
  const session = await prisma.paceSession.create({
    data: {
      userId: user.id,
      logId: exercise.logId,
      exerciseId: exercise.id,
      performedAt: parsePerformedDate(parsed.data.performedDate),
      hours: metrics.hours,
      minutes: metrics.minutes,
      seconds: metrics.seconds,
      distance: decimalString(metrics.distance, 2),
      pace: decimalString(metrics.pace),
      paceMinutes: metrics.paceMinutes,
      paceSeconds: metrics.paceSeconds,
      speed: decimalString(metrics.speed),
    },
  });

  const exercisePath = `/logs/${exercise.log.slug}/exercises/${exercise.slug}`;

  revalidatePath(exercisePath);
  redirect(`${exercisePath}/pace/${session.id}`);
}

export async function updatePaceSessionAction(
  _previousState: PaceActionState,
  formData: FormData,
): Promise<PaceActionState> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const parsed = parsePaceForm(formData);

  if (!sessionId) {
    return { formError: "Session id is missing." };
  }

  if (!parsed.success) {
    return {
      fieldErrors: getFieldErrors(parsed),
    };
  }

  const existingSession = await prisma.paceSession.findFirst({
    where: {
      id: sessionId,
      userId: user.id,
      exercise: {
        sessionKind: SessionKind.PACE,
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

  const metrics = calculatePaceMetrics(parsed.data);

  await prisma.paceSession.update({
    where: { id: existingSession.id },
    data: {
      performedAt: parsePerformedDate(parsed.data.performedDate),
      hours: metrics.hours,
      minutes: metrics.minutes,
      seconds: metrics.seconds,
      distance: decimalString(metrics.distance, 2),
      pace: decimalString(metrics.pace),
      paceMinutes: metrics.paceMinutes,
      paceSeconds: metrics.paceSeconds,
      speed: decimalString(metrics.speed),
    },
  });

  const exercisePath = `/logs/${existingSession.exercise.log.slug}/exercises/${existingSession.exercise.slug}`;

  revalidatePath(exercisePath);
  revalidatePath(`${exercisePath}/pace/${existingSession.id}`);
  revalidatePath(`${exercisePath}/pace/${existingSession.id}/edit`);
  redirect(`${exercisePath}/pace/${existingSession.id}`);
}

export async function deletePaceSessionAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    notFound();
  }

  const session = await prisma.paceSession.findFirst({
    where: {
      id: sessionId,
      userId: user.id,
      exercise: {
        sessionKind: SessionKind.PACE,
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

  await prisma.paceSession.delete({
    where: { id: session.id },
  });

  const exercisePath = `/logs/${session.exercise.log.slug}/exercises/${session.exercise.slug}`;

  revalidatePath(exercisePath);
  redirect(exercisePath);
}
