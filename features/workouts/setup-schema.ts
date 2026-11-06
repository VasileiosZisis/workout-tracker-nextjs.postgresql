import { z } from "zod";
import { exerciseFormSchema } from "@/features/exercises/schema";
import { performedDateSchema, requestIdSchema, workoutNameSchema } from "./schema";
import { scheduleStyle, timezoneSchema } from "./calendar";

const id = z.string().min(1).max(100);
export const inlineExerciseSchema = z.object({ id: z.string().regex(/^new:[0-9a-f-]{36}$/), title: exerciseFormSchema.shape.title });
export const exerciseSelectionSchema = z.object({
  exerciseIds: z.array(id).min(1, "Choose at least one exercise for this workout.").max(500),
  newExercises: z.array(inlineExerciseSchema).max(100).default([]),
}).superRefine((value, ctx) => {
  if (new Set(value.exerciseIds).size !== value.exerciseIds.length || new Set(value.newExercises.map((item) => item.id)).size !== value.newExercises.length) ctx.addIssue({ code: "custom", message: "Choose each exercise only once per workout." });
});
export const routineSetupSchema = z.object({
  requestId: requestIdSchema, name: workoutNameSchema, nextId: id,
  workouts: z.array(z.object({ id, name: workoutNameSchema, exerciseIds: exerciseSelectionSchema.shape.exerciseIds })).min(1).max(30),
  newExercises: z.array(inlineExerciseSchema).max(100).default([]),
  style: scheduleStyle, timezone: timezoneSchema, weekStart: z.number().int().min(0).max(6), today: performedDateSchema,
  assignments: z.array(z.object({ weekday: z.number().int().min(0).max(6), definitionId: id })).max(7),
}).superRefine((value, ctx) => {
  const ids = value.workouts.map((item) => item.id);
  if (new Set(ids).size !== ids.length || !ids.includes(value.nextId)) ctx.addIssue({ code: "custom", message: "Choose a workout in this routine as the next workout." });
  if (value.workouts.some((item) => new Set(item.exerciseIds).size !== item.exerciseIds.length) || new Set(value.newExercises.map((item) => item.id)).size !== value.newExercises.length) ctx.addIssue({ code: "custom", message: "Choose each exercise only once per workout." });
  if (value.style === "FIXED" && (!value.assignments.length || new Set(value.assignments.map((item) => item.weekday)).size !== value.assignments.length || value.assignments.some((item) => !ids.includes(item.definitionId)))) ctx.addIssue({ code: "custom", message: "Assign at least one weekday, using one current workout per day." });
});
export type RoutineSetupInput = z.infer<typeof routineSetupSchema>;
export type ExerciseOption = { id: string; title: string; slug: string };
export type SetupState = { error?: string; routineId?: string };
export const assignmentSaveSchema = exerciseSelectionSchema.and(z.object({ routineId: id, definitionId: id, revision: z.number().int().min(0), expectedScheduleId: z.string().max(100), expectedToday: performedDateSchema }));
