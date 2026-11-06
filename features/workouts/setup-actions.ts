"use server";

import { z, ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizePagination } from "@/features/logs/pagination";
import { WorkoutError } from "./service";
import { createRoutineFromSetup, saveWorkoutAssignments } from "./setup-service";
import type { SetupState } from "./setup-schema";

function invalidate(slug: string) {
  revalidatePath(`/logs/${slug}`, "layout"); revalidatePath(`/routine/${slug}`); revalidatePath("/routine");
  revalidatePath(`/routine/${slug}/edit`);
}
function report(error: unknown): SetupState {
  if (error instanceof WorkoutError) return { error: error.message };
  if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Check the routine details." };
  throw error;
}
export async function createRoutineSetupAction(_state: SetupState, form: FormData): Promise<SetupState> {
  const user = await requireUser(), logId = String(form.get("logId") ?? "");
  const log = await prisma.log.findFirst({ where: { id: logId, userId: user.id }, select: { slug: true } });
  if (!log) return { error: "Log not found." };
  let result: { routineId: string };
  try {
    const payload = String(form.get("payload") ?? "");
    if (payload.length > 250000) return { error: "The setup is too large. Reduce the exercise selection." };
    let raw: unknown;
    try { raw = JSON.parse(payload); } catch { return { error: "Reload setup and try again." }; }
    result = await createRoutineFromSetup(user.id, logId, raw);
  } catch (error) { return report(error); }
  invalidate(log.slug);
  return result;
}
export async function saveWorkoutAssignmentsAction(_state: SetupState, form: FormData): Promise<SetupState> {
  const user = await requireUser(), logId = String(form.get("logId") ?? "");
  const log = await prisma.log.findFirst({ where: { id: logId, userId: user.id }, select: { slug: true } });
  if (!log) return { error: "Log not found." };
  try {
    const payload = String(form.get("payload") ?? "");
    if (payload.length > 100000) return { error: "The exercise selection is too large." };
    let raw: unknown;
    try { raw = JSON.parse(payload); } catch { return { error: "Reload the exercise editor and try again." }; }
    await saveWorkoutAssignments(user.id, logId, raw);
  } catch (error) { return report(error); }
  invalidate(log.slug);
  return { routineId: String(form.get("routineId") ?? "saved") };
}

export async function searchRoutineExercisesAction(raw: unknown) {
  const user = await requireUser();
  const input = z.object({ logId: z.string().min(1), query: z.string().trim().max(80).default(""), page: z.number().int().min(1).default(1) }).parse(raw);
  const log = await prisma.log.findFirst({ where: { id: input.logId, userId: user.id }, select: { id: true } });
  if (!log) return { error: "Log not found.", exercises: [], page: 1, totalPages: 1 };
  const where = { userId: user.id, logId: log.id, sessionKind: "WEIGHTLIFTING" as const, title: { contains: input.query, mode: "insensitive" as const } };
  const totalItems = await prisma.exercise.count({ where });
  const pagination = normalizePagination({ page: input.page, limit: 12, totalItems });
  const exercises = await prisma.exercise.findMany({ where, skip: pagination.skip, take: pagination.limit, orderBy: [{ title: "asc" }, { id: "asc" }], select: { id: true, title: true, slug: true } });
  return { exercises, page: pagination.page, totalPages: pagination.totalPages };
}

export async function validateRoutineExercisesAction(raw: unknown) {
  const user = await requireUser();
  const { logId, ids } = z.object({ logId: z.string().min(1), ids: z.array(z.string().min(1).max(100)).max(15000) }).parse(raw);
  return prisma.exercise.findMany({ where: { id: { in: ids }, userId: user.id, logId, log: { userId: user.id }, sessionKind: "WEIGHTLIFTING" }, select: { id: true, title: true, slug: true } });
}
