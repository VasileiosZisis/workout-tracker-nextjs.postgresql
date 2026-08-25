import { z } from "zod";

const wholeNumber = z.coerce.number().int("Use a whole number.");

const durationMinutes = wholeNumber
  .min(0, "Minutes cannot be negative.")
  .max(999, "Minutes must be 999 or fewer.");

const durationSecondsPart = wholeNumber
  .min(0, "Seconds cannot be negative.")
  .max(59, "Seconds must be 59 or fewer.");

export const intervalSessionSchema = z
  .object({
    performedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date."),
    rounds: wholeNumber
      .min(2, "Rounds must be at least 2.")
      .max(999, "Rounds must be 999 or fewer."),
    workMinutes: durationMinutes,
    workSecondsPart: durationSecondsPart,
    recoveryMinutes: durationMinutes,
    recoverySecondsPart: durationSecondsPart,
    includeFinalRecovery: z.boolean(),
  })
  .refine(
    (data) => data.workMinutes > 0 || data.workSecondsPart > 0,
    {
      message: "Work duration must be at least 1 second.",
      path: ["workSecondsPart"],
    },
  )
  .refine(
    (data) => data.recoveryMinutes > 0 || data.recoverySecondsPart > 0,
    {
      message: "Recovery duration must be at least 1 second.",
      path: ["recoverySecondsPart"],
    },
  );

export type IntervalSessionInput = z.infer<typeof intervalSessionSchema>;

