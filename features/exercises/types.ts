import { SessionKind } from "@/generated/prisma/enums";

export type ExerciseActionState = {
  fieldErrors?: {
    title?: string[];
    sessionKind?: string[];
  };
  formError?: string;
};

export const sessionKindLabels: Record<SessionKind, string> = {
  WEIGHTLIFTING: "Weightlifting",
  PACE: "Pace",
};
