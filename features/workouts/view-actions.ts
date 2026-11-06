"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { endEntry, lockWorkoutContext, startEntry, WorkoutError } from "./service";
import { schedulingInputSchema } from "./scheduling";
import type { WorkoutActionState } from "./schema";

function invalidate(slug: string) {
  revalidatePath(`/logs/${slug}`, "layout");
  revalidatePath(`/routine/${slug}`);
  revalidatePath(`/routine/${slug}/edit`);
  revalidatePath("/routine");
}
function actionError(error: unknown): WorkoutActionState {
  if (error instanceof WorkoutError) return { error: error.message };
  if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Check the workout details." };
  throw error;
}

export async function startWorkoutFromViewAction(_state: WorkoutActionState, form: FormData): Promise<WorkoutActionState> {
  const user = await requireUser();
  const logId = String(form.get("logId") ?? "");
  const log = await prisma.log.findFirst({ where: { id: logId, userId: user.id }, select: { slug: true } });
  if (!log) return { error: "Log not found." };
  let entrySlug: string;
  try {
    const entry = await prisma.$transaction(async (tx) => {
      const routine = await lockWorkoutContext(tx, user.id, logId);
      return startEntry(tx, user.id, logId, routine, {
        routineId: String(form.get("routineId") ?? ""), revision: Number(form.get("revision")),
        nextId: String(form.get("nextId") ?? ""), date: String(form.get("performedDate") ?? ""), requestId: String(form.get("requestId") ?? ""),
        scheduling: schedulingInputSchema.parse({ intent: form.get("schedulingIntent"), scheduleId: form.get("scheduleId"), slotKey: form.get("slotKey"), definitionId: form.get("chosenDefinitionId"), today: form.get("scheduleToday") }),
      });
    }, { timeout: 30000 });
    entrySlug = entry.status === "DISCARDED" ? "" : entry.slug;
  } catch (error) { return actionError(error); }
  invalidate(log.slug);
  redirect(entrySlug ? `/logs/${log.slug}/workouts/${entrySlug}` : `/logs/${log.slug}`);
}

export async function endWorkoutFromViewAction(_state: WorkoutActionState, form: FormData): Promise<WorkoutActionState> {
  const user = await requireUser();
  const logId = String(form.get("logId") ?? "");
  const log = await prisma.log.findFirst({ where: { id: logId, userId: user.id }, select: { slug: true } });
  if (!log) return { error: "Log not found." };
  try {
    const operation = form.get("operation");
    if (operation !== "finish" && operation !== "discard") return { error: "Choose a valid workout action." };
    if (operation === "discard" && form.get("confirmed") !== "yes") return { error: "Confirm deleting this workout first." };
    await endEntry(user.id, logId, String(form.get("entryId") ?? ""), operation === "discard");
  } catch (error) { return actionError(error); }
  invalidate(log.slug);
  redirect(`/logs/${log.slug}`);
}
