"use server";

import { SessionKind } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { parsePerformedDate } from "./format";
import { calculateIntervalMetrics } from "./metrics";
import { intervalSessionSchema } from "./schema";
import type { IntervalActionState } from "./types";

function parseIntervalForm(formData: FormData) {
  return intervalSessionSchema.safeParse({
    performedDate: formData.get("performedDate"),
    rounds: formData.get("rounds"),
    workMinutes: formData.get("workMinutes"),
    workSecondsPart: formData.get("workSecondsPart"),
    recoveryMinutes: formData.get("recoveryMinutes"),
    recoverySecondsPart: formData.get("recoverySecondsPart"),
    includeFinalRecovery: formData.has("includeFinalRecovery"),
  });
}

function getFieldErrors(parsed: ReturnType<typeof parseIntervalForm>) {
  if (parsed.success) {
    return undefined;
  }

  return parsed.error.flatten().fieldErrors;
}

export async function createIntervalSessionAction(
  _previousState: IntervalActionState,
  formData: FormData,
): Promise<IntervalActionState> {
  const user = await requireUser();
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const parsed = parseIntervalForm(formData);

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
      sessionKind: SessionKind.INTERVAL,
    },
    include: {
      log: true,
    },
  });

  if (!exercise) {
    notFound();
  }

  const metrics = calculateIntervalMetrics(parsed.data);
  const session = await prisma.intervalSession.create({
    data: {
      userId: user.id,
      logId: exercise.logId,
      exerciseId: exercise.id,
      performedAt: parsePerformedDate(parsed.data.performedDate),
      rounds: metrics.rounds,
      workSeconds: metrics.workSeconds,
      recoverySeconds: metrics.recoverySeconds,
      includeFinalRecovery: metrics.includeFinalRecovery,
      totalWorkSeconds: metrics.totalWorkSeconds,
      totalRecoverySeconds: metrics.totalRecoverySeconds,
      intervalBlockSeconds: metrics.intervalBlockSeconds,
    },
  });

  const exercisePath = `/logs/${exercise.log.slug}/exercises/${exercise.slug}`;

  revalidatePath(exercisePath);
  redirect(`${exercisePath}/interval/${session.id}`);
}

export async function updateIntervalSessionAction(
  _previousState: IntervalActionState,
  formData: FormData,
): Promise<IntervalActionState> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const parsed = parseIntervalForm(formData);

  if (!sessionId) {
    return { formError: "Session id is missing." };
  }

  if (!parsed.success) {
    return {
      fieldErrors: getFieldErrors(parsed),
    };
  }

  const existingSession = await prisma.intervalSession.findFirst({
    where: {
      id: sessionId,
      userId: user.id,
      exercise: {
        userId: user.id,
        sessionKind: SessionKind.INTERVAL,
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

  const metrics = calculateIntervalMetrics(parsed.data);

  await prisma.intervalSession.update({
    where: { id: existingSession.id },
    data: {
      performedAt: parsePerformedDate(parsed.data.performedDate),
      rounds: metrics.rounds,
      workSeconds: metrics.workSeconds,
      recoverySeconds: metrics.recoverySeconds,
      includeFinalRecovery: metrics.includeFinalRecovery,
      totalWorkSeconds: metrics.totalWorkSeconds,
      totalRecoverySeconds: metrics.totalRecoverySeconds,
      intervalBlockSeconds: metrics.intervalBlockSeconds,
    },
  });

  const exercisePath = `/logs/${existingSession.exercise.log.slug}/exercises/${existingSession.exercise.slug}`;

  revalidatePath(exercisePath);
  revalidatePath(`${exercisePath}/interval/${existingSession.id}`);
  revalidatePath(`${exercisePath}/interval/${existingSession.id}/edit`);
  redirect(`${exercisePath}/interval/${existingSession.id}`);
}

export async function deleteIntervalSessionAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    notFound();
  }

  const session = await prisma.intervalSession.findFirst({
    where: {
      id: sessionId,
      userId: user.id,
      exercise: {
        userId: user.id,
        sessionKind: SessionKind.INTERVAL,
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

  await prisma.intervalSession.delete({
    where: { id: session.id },
  });

  const exercisePath = `/logs/${session.exercise.log.slug}/exercises/${session.exercise.slug}`;

  revalidatePath(exercisePath);
  redirect(exercisePath);
}
