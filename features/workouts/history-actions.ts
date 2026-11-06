"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { createHistoricalWorkout, reassignWorkoutSession } from "./history";
import { WorkoutError } from "./service";
import type { WorkoutActionState } from "./schema";

function invalidate(logSlug: string) {
  revalidatePath(`/logs/${logSlug}`, "layout");
  revalidatePath(`/routine/${logSlug}`);
  revalidatePath(`/routine/${logSlug}/edit`);
  revalidatePath("/routine");
}

export async function groupHistoricalWorkoutAction(_state: WorkoutActionState, form: FormData): Promise<WorkoutActionState> {
  const user = await requireUser();
  const logId = String(form.get("logId") ?? "");
  const log = await prisma.log.findFirst({ where: { id: logId, userId: user.id }, select: { slug: true } });
  if (!log) return { error: "Log not found." };
  let entrySlug: string;
  try {
    const entry = await createHistoricalWorkout(user.id, logId, {
      routineId: form.get("routineId"), revision: form.get("revision"), definitionId: form.get("definitionId"),
      performedDate: form.get("performedDate"), requestId: form.get("requestId"), sessionIds: form.getAll("sessionIds"),
      ...(form.has("scheduleId") ? { scheduleId: form.get("scheduleId"), slotKey: form.get("slotKey") } : {}),
    });
    entrySlug = entry.slug;
  } catch (error) {
    if (error instanceof WorkoutError) return { error: error.message };
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Check the selected sessions." };
    throw error;
  }
  invalidate(log.slug);
  redirect(`/logs/${log.slug}/workouts/${entrySlug}`);
}

export async function reassignWorkoutAction(_state: WorkoutActionState, form: FormData): Promise<WorkoutActionState> {
  const user = await requireUser();
  const logId = String(form.get("logId") ?? "");
  const log = await prisma.log.findFirst({ where: { id: logId, userId: user.id }, select: { slug: true } });
  if (!log) return { error: "Log not found." };
  let sessionPath: string;
  try {
    const session = await reassignWorkoutSession(user.id, logId, {
      routineId: form.get("routineId"), sessionId: form.get("sessionId"),
      expectedEntryId: form.get("expectedEntryId"), expectedUpdatedAt: form.get("expectedUpdatedAt"),
      targetEntryId: form.get("targetEntryId"),
    });
    sessionPath = `/logs/${log.slug}/exercises/${session.exercise.slug}/weightlifting/${session.id}`;
  } catch (error) {
    if (error instanceof WorkoutError) return { error: error.message };
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Check the workout selection." };
    throw error;
  }
  invalidate(log.slug);
  redirect(sessionPath);
}
