import { z } from "zod";

const decimalNumber = z.coerce
  .number()
  .finite("Use a valid number.")
  .multipleOf(0.01, "Use at most two decimal places.");

export const weightliftingSetSchema = z.object({
  repetitions: decimalNumber
    .min(0.01, "Repetitions must be greater than 0.")
    .max(999.99, "Repetitions must be 999.99 or fewer."),
  kilograms: decimalNumber
    .min(0, "Kilograms cannot be negative.")
    .max(9999.99, "Kilograms must be 9999.99 or fewer."),
  isHard: z.boolean(),
});

export const weightliftingSessionSchema = z.object({
  performedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date."),
  sets: z
    .array(weightliftingSetSchema)
    .min(1, "Add at least one set.")
    .max(30, "Use 30 sets or fewer."),
});

export type WeightliftingSessionInput = z.infer<
  typeof weightliftingSessionSchema
>;
