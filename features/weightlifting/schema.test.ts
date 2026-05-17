import { weightliftingSessionSchema } from "./schema";

describe("weightliftingSessionSchema", () => {
  it("accepts a valid session", () => {
    const parsed = weightliftingSessionSchema.safeParse({
      performedDate: "2026-05-17",
      sets: [
        { repetitions: "10", kilograms: "50", isHard: false },
        { repetitions: "5", kilograms: "100", isHard: true },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects missing sets", () => {
    const parsed = weightliftingSessionSchema.safeParse({
      performedDate: "2026-05-17",
      sets: [],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid dates", () => {
    const parsed = weightliftingSessionSchema.safeParse({
      performedDate: "17/05/2026",
      sets: [{ repetitions: "10", kilograms: "50", isHard: false }],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects negative kilograms", () => {
    const parsed = weightliftingSessionSchema.safeParse({
      performedDate: "2026-05-17",
      sets: [{ repetitions: "10", kilograms: "-1", isHard: false }],
    });

    expect(parsed.success).toBe(false);
  });
});
