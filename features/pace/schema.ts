import { z } from "zod";

const wholeNumber = z.coerce.number().int("Use a whole number.");
const decimalNumber = z.coerce
  .number()
  .finite("Use a valid number.")
  .multipleOf(0.01, "Use at most two decimal places.");

export const paceSessionSchema = z
  .object({
    performedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date."),
    hours: wholeNumber
      .min(0, "Hours cannot be negative.")
      .max(999, "Hours must be 999 or fewer."),
    minutes: wholeNumber
      .min(0, "Minutes cannot be negative.")
      .max(59, "Minutes must be 59 or fewer."),
    seconds: wholeNumber
      .min(0, "Seconds cannot be negative.")
      .max(59, "Seconds must be 59 or fewer."),
    distance: decimalNumber
      .min(0, "Distance cannot be negative.")
      .max(99999.99, "Distance must be 99999.99 km or fewer."),
  })
  .refine(
    (data) =>
      data.hours > 0 || data.minutes > 0 || data.seconds > 0 || data.distance > 0,
    {
      message: "Enter a time or distance.",
      path: ["distance"],
    },
  );

export type PaceSessionInput = z.infer<typeof paceSessionSchema>;
