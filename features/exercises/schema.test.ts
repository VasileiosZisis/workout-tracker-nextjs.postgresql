import { SessionKind } from "@/generated/prisma/enums";
import { exerciseFormSchema } from "./schema";

describe("exerciseFormSchema", () => {
  it("accepts valid weightlifting exercises", () => {
    const parsed = exerciseFormSchema.safeParse({
      title: "Bench Press",
      sessionKind: SessionKind.WEIGHTLIFTING,
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts valid pace exercises", () => {
    const parsed = exerciseFormSchema.safeParse({
      title: "Tempo Run",
      sessionKind: SessionKind.PACE,
    });

    expect(parsed.success).toBe(true);
  });

  it("trims accepted titles", () => {
    const parsed = exerciseFormSchema.parse({
      title: "  Squat  ",
      sessionKind: SessionKind.WEIGHTLIFTING,
    });

    expect(parsed.title).toBe("Squat");
  });

  it("rejects blank titles", () => {
    const parsed = exerciseFormSchema.safeParse({
      title: " ",
      sessionKind: SessionKind.WEIGHTLIFTING,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid session kinds", () => {
    const parsed = exerciseFormSchema.safeParse({
      title: "Bench Press",
      sessionKind: "CARDIO",
    });

    expect(parsed.success).toBe(false);
  });
});
