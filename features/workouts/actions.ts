"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import type { WorkoutActionState } from "./schema";
import { endEntry, lockWorkoutContext, saveRoutine, startEntry, WorkoutError } from "./service";

export async function workoutAction(_state: WorkoutActionState, form: FormData): Promise<WorkoutActionState> {
  const user = await requireUser();
  const logId = String(form.get("logId") ?? "");
  const log = await prisma.log.findFirst({ where: { id: logId, userId: user.id }, select: { slug: true } });
  if (!log) return { error: "Log not found." };
  try {
    const operation = form.get("operation");
    if (operation === "save") {
      const json = String(form.get("workouts") ?? "");
      if (json.length > 16000) return { error: "Use 30 workouts or fewer." };
      let workouts: unknown;
      try { workouts = JSON.parse(json); } catch { return { error: "Reload the routine settings and try again." }; }
      await saveRoutine(user.id, logId, { name: form.get("name"), revision: form.get("revision"), nextId: form.get("nextId"), workouts });
    } else if (operation === "start") {
      await prisma.$transaction(async (tx) => {
        const routine = await lockWorkoutContext(tx, user.id, logId);
        await startEntry(tx, user.id, logId, routine, {
          routineId: String(form.get("routineId") ?? ""), revision: Number(form.get("revision")),
          nextId: String(form.get("nextId") ?? ""), date: String(form.get("performedDate") ?? ""), requestId: String(form.get("requestId") ?? ""),
        });
      });
    } else if (operation === "finish" || operation === "discard") {
      if (operation === "discard" && form.get("confirmed") !== "yes") return { error: "Confirm discarding this workout first." };
      await endEntry(user.id, logId, String(form.get("entryId") ?? ""), operation === "discard");
    } else return { error: "Choose a valid workout action." };
  } catch (error) {
    if (error instanceof WorkoutError) return { error: error.message };
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Check the workout details." };
    throw error;
  }
  revalidatePath(`/logs/${log.slug}`, "layout");
  return { success: "Workout updated." };
}
