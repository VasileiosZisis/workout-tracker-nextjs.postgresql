import { SessionKind } from "@/generated/prisma/enums";
import { z } from "zod";

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(80, "Title must be 80 characters or fewer.")
  .regex(/^[A-Za-z0-9-_ ]+$/, "Use letters, numbers, spaces, hyphens, or underscores.");

export const exerciseFormSchema = z.object({
  title: titleSchema,
  sessionKind: z.enum(SessionKind, "Choose a session type."),
});

export type ExerciseFormInput = z.infer<typeof exerciseFormSchema>;
