import { z } from "zod";
import { requestIdSchema } from "./schema";
import { inlineExerciseSchema } from "./setup-schema";
import { scheduleStyle } from "./calendar";

const ref = z.string().min(1).max(100);
export const setupDraftSchema = z.object({
  version: z.literal(1), requestId: requestIdSchema, step: z.number().int().min(1).max(3),
  name: z.string().max(80), nextId: z.string().max(100),
  workouts: z.array(z.object({ id: ref, name: z.string().max(80), exerciseIds: z.array(ref).max(500) })).min(1).max(30),
  newExercises: z.array(inlineExerciseSchema).max(100),
  catalog: z.array(z.object({ id: ref, title: z.string().max(80), slug: z.string().max(160) })).max(15000),
  style: scheduleStyle, timezone: z.string().max(100), weekStart: z.number().int().min(0).max(6),
  assignments: z.array(z.object({ weekday: z.number().int().min(0).max(6), definitionId: ref })).max(7),
});
export type SetupDraft = z.infer<typeof setupDraftSchema>;
export function draftKey(userId: string, logId: string) { return `routine-setup:v1:${encodeURIComponent(userId)}:${encodeURIComponent(logId)}`; }
export function newSetupDraft(requestId: string, timezone = "UTC"): SetupDraft {
  const id = `new:${requestId}`;
  return { version: 1, requestId, step: 1, name: "", nextId: id, workouts: [{ id, name: "", exerciseIds: [] }], newExercises: [], catalog: [], style: "CONTINUOUS", timezone, weekStart: 1, assignments: [] };
}
export function restoreSetupDraft(raw: string | null): SetupDraft | null {
  if (!raw || raw.length > 1000000) return null;
  try { const result = setupDraftSchema.safeParse(JSON.parse(raw)); return result.success ? result.data : null; } catch { return null; }
}
export function setupStepError(draft: SetupDraft): string | null {
  if (draft.step === 1 && (!draft.name.trim() || draft.workouts.some((item) => !item.name.trim()))) return "Name your routine and every workout.";
  const known = new Set([...draft.catalog.map((item) => item.id), ...draft.newExercises.map((item) => item.id)]);
  if (draft.step === 2 && draft.workouts.some((item) => !item.exerciseIds.length || item.exerciseIds.some((id) => !known.has(id)))) return "Choose at least one available exercise for each workout.";
  return null;
}
export function moveItem<T>(items: T[], index: number, offset: number) {
  const next = [...items];
  if (index < 0 || index >= items.length || index + offset < 0 || index + offset >= items.length) return next;
  [next[index], next[index + offset]] = [next[index + offset], next[index]];
  return next;
}
