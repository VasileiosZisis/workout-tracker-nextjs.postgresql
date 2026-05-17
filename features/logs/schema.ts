import { z } from "zod";

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(80, "Title must be 80 characters or fewer.")
  .regex(/^[A-Za-z0-9-_ ]+$/, "Use letters, numbers, spaces, hyphens, or underscores.");

export const logFormSchema = z.object({
  title: titleSchema,
});

export type LogFormInput = z.infer<typeof logFormSchema>;
