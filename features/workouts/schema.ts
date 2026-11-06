import { z } from "zod";

export const workoutNameSchema = z.string().trim().min(1, "Enter a name.").max(80, "Use 80 characters or fewer.");
export const performedDateSchema = z.iso.date("Choose a valid date.");
export const requestIdSchema = z.uuid("Reload the page and try again.");
export const routineSchema = z.object({
  name: workoutNameSchema,
  revision: z.coerce.number().int().min(0),
  workouts: z.array(z.object({ id: z.string().max(100), name: workoutNameSchema })).min(1).max(30),
  nextId: z.string().min(1),
  expectedScheduleId: z.string().max(100).optional(),
  expectedToday: performedDateSchema.optional(),
  applyTodayConfirmed: z.literal("yes").optional(),
}).superRefine((value, ctx) => {
  const ids = value.workouts.map((workout) => workout.id);
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length || !ids.includes(value.nextId)) {
    ctx.addIssue({ code: "custom", message: "Choose a retained workout as the next workout." });
  }
});

export type WorkoutActionState = { error?: string; success?: string };
export type WorkoutSelection = {
  schedule?: import("./schedule-queries").ScheduleContext | null;
  definitions?: { id: string; name: string }[];
  routineId: string;
  revision: number;
  nextId: string;
  nextName: string;
  active: { id: string; slug: string; name: string; date: string } | null;
};
