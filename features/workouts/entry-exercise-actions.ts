"use server";

import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { changeEntryExercise } from "./entry-exercises";
import { WorkoutError } from "./service";
import type { WorkoutActionState } from "./schema";

export async function changeEntryExerciseAction(_previous: WorkoutActionState, form: FormData): Promise<WorkoutActionState> {
  const user = await requireUser(), logId = String(form.get("logId") ?? "");
  const log = await prisma.log.findFirst({ where: { id: logId, userId: user.id }, select: { slug: true } });
  if (!log) return { error: "Log not found." };
  try {
    const payload = String(form.get("payload") ?? "");
    if (payload.length > 4000) return { error: "Reload the workout and try again." };
    let raw: unknown;
    try { raw = JSON.parse(payload); } catch { return { error: "Reload the workout and try again." }; }
    const result = await changeEntryExercise(user.id, logId, raw);
    revalidatePath(`/logs/${log.slug}`, "layout");
    revalidatePath(`/logs/${log.slug}/workouts/${result.entrySlug}`);
    if (result.exerciseSlug) revalidatePath(`/logs/${log.slug}/exercises/${result.exerciseSlug}`);
    return { success: "Workout exercises updated." };
  } catch (error) {
    if (error instanceof WorkoutError) return { error: error.message };
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Check the exercise selection." };
    throw error;
  }
}
