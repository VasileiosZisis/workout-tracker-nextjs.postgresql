"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import type { WorkoutActionState } from "./schema";
import { deleteRoutine, endEntry, lockWorkoutContext, saveRoutine, startEntry, WorkoutError } from "./service";
import { changeWorkoutSuggestions } from "./suggestions";
import { cancelSchedule, saveSchedule, scheduleControl, schedulingInputSchema } from "./scheduling";

export async function workoutAction(_state: WorkoutActionState, form: FormData): Promise<WorkoutActionState> {
  const user = await requireUser();
  const logId = String(form.get("logId") ?? "");
  const log = await prisma.log.findFirst({ where: { id: logId, userId: user.id }, select: { slug: true } });
  if (!log) return { error: "Log not found." };
  try {
    const operation = form.get("operation");
    if (operation === "saveSchedule") {
      let assignments: unknown;
      try { assignments = JSON.parse(String(form.get("assignments") ?? "[]")); } catch { return { error: "Check weekday assignments." }; }
      await saveSchedule(user.id, logId, { routineId: form.get("routineId"), revision: form.get("revision"), style: form.get("style"), timezone: form.get("timezone"), weekStart: form.get("weekStart"), effective: form.get("effective"), confirmed: form.get("confirmed"), expectedScheduleId: form.get("expectedScheduleId"), expectedToday: form.get("expectedToday"), assignments });
    } else if (operation === "cancelSchedule") {
      await cancelSchedule(user.id, logId, String(form.get("routineId") ?? ""), Number(form.get("revision")));
    } else if (operation === "skip" || operation === "reset") {
      await scheduleControl(user.id, logId, { routineId: String(form.get("routineId") ?? ""), revision: Number(form.get("revision")), requestId: String(form.get("requestId") ?? ""), operation, scheduleId: String(form.get("scheduleId") ?? ""), slotKey: String(form.get("slotKey") ?? ""), today: String(form.get("scheduleToday") ?? ""), nextId: String(form.get("nextId") ?? "") });
    } else if (operation === "save") {
      const json = String(form.get("workouts") ?? "");
      if (json.length > 16000) return { error: "Use 30 workouts or fewer." };
      let workouts: unknown;
      try { workouts = JSON.parse(json); } catch { return { error: "Reload the routine settings and try again." }; }
      await saveRoutine(user.id, logId, { name: form.get("name"), revision: form.get("revision"), nextId: form.get("nextId"), workouts,
        ...(form.has("expectedScheduleId") ? { expectedScheduleId: form.get("expectedScheduleId"), expectedToday: form.get("expectedToday") } : {}),
        ...(form.has("applyTodayConfirmed") ? { applyTodayConfirmed: form.get("applyTodayConfirmed") } : {}),
      });
    } else if (operation === "removeExercise" || operation === "reorderExercises") {
      let order: unknown = [];
      if (operation === "reorderExercises") {
        try { order = JSON.parse(String(form.get("order") ?? "")); }
        catch { return { error: "Reload the exercise list and try again." }; }
      }
      await changeWorkoutSuggestions(user.id, logId, {
        routineId: form.get("routineId"), revision: form.get("revision"), definitionId: form.get("definitionId"),
        change: operation === "removeExercise"
          ? { operation, suggestionId: form.get("suggestionId") }
          : { operation, order },
      });
    } else if (operation === "delete") {
      if (form.get("confirmed") !== "yes") return { error: "Confirm deleting this routine first." };
      await deleteRoutine(user.id, logId, String(form.get("routineId") ?? ""), Number(form.get("revision")));
    } else if (operation === "start") {
      await prisma.$transaction(async (tx) => {
        const routine = await lockWorkoutContext(tx, user.id, logId);
        await startEntry(tx, user.id, logId, routine, {
          routineId: String(form.get("routineId") ?? ""), revision: Number(form.get("revision")),
          nextId: String(form.get("nextId") ?? ""), date: String(form.get("performedDate") ?? ""), requestId: String(form.get("requestId") ?? ""),
          scheduling: form.has("schedulingIntent") ? schedulingInputSchema.parse({ intent: form.get("schedulingIntent"), scheduleId: form.get("scheduleId"), slotKey: form.get("slotKey"), definitionId: form.get("chosenDefinitionId"), today: form.get("scheduleToday") }) : undefined,
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
  revalidatePath(`/routine/${log.slug}`);
  revalidatePath(`/routine/${log.slug}/edit`);
  revalidatePath("/routine");
  return { success: "Workout updated." };
}
