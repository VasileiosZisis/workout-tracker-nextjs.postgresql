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

  it.each([
    "2026-02-28",
    "2026-04-30",
    "2024-02-29",
    "2000-02-29",
  ])("accepts the calendar date %s without changing it", (performedDate) => {
    const parsed = weightliftingSessionSchema.parse({
      performedDate,
      sets: [{ repetitions: "10", kilograms: "50", isHard: false }],
    });

    expect(parsed.performedDate).toBe(performedDate);
  });

  it.each([
    "2026-02-31",
    "2026-02-29",
    "2026-04-31",
    "1900-02-29",
    "2026-00-01",
    "2026-13-01",
    "2026-01-00",
    "2026-01-32",
    "17/05/2026",
    "2026-5-17",
    "2026-05-17T00:00:00.000Z",
    "2026-05-17\n",
    "not-a-date",
    "",
  ])("rejects invalid date %j without throwing", (performedDate) => {
    const parsed = weightliftingSessionSchema.safeParse({
      performedDate,
      sets: [{ repetitions: "10", kilograms: "50", isHard: false }],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.performedDate).toEqual([
      "Use a valid date.",
    ]);
  });

  it("rejects negative kilograms", () => {
    const parsed = weightliftingSessionSchema.safeParse({
      performedDate: "2026-05-17",
      sets: [{ repetitions: "10", kilograms: "-1", isHard: false }],
    });

    expect(parsed.success).toBe(false);
  });
});
