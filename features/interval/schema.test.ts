import { intervalSessionSchema } from "./schema";

const validInput = {
  performedDate: "2026-08-19",
  rounds: "10",
  workMinutes: "0",
  workSecondsPart: "30",
  recoveryMinutes: "1",
  recoverySecondsPart: "0",
  includeFinalRecovery: false,
};

const invalidCases: Array<[string, Record<string, unknown>]> = [
  ["one round", { rounds: "1" }],
  ["too many rounds", { rounds: "1000" }],
  ["fractional rounds", { rounds: "2.5" }],
  ["zero work duration", { workMinutes: "0", workSecondsPart: "0" }],
  [
    "zero recovery duration",
    { recoveryMinutes: "0", recoverySecondsPart: "0" },
  ],
  ["negative minutes", { workMinutes: "-1" }],
  ["too many minutes", { recoveryMinutes: "1000" }],
  ["negative seconds", { workSecondsPart: "-1" }],
  ["too many seconds", { recoverySecondsPart: "60" }],
];

describe("intervalSessionSchema", () => {
  it("accepts and coerces a valid interval session", () => {
    const parsed = intervalSessionSchema.parse(validInput);

    expect(parsed).toEqual({
      performedDate: "2026-08-19",
      rounds: 10,
      workMinutes: 0,
      workSecondsPart: 30,
      recoveryMinutes: 1,
      recoverySecondsPart: 0,
      includeFinalRecovery: false,
    });
  });

  it("accepts the supported upper bounds", () => {
    const parsed = intervalSessionSchema.safeParse({
      ...validInput,
      rounds: "999",
      workMinutes: "999",
      workSecondsPart: "59",
      recoveryMinutes: "999",
      recoverySecondsPart: "59",
      includeFinalRecovery: true,
    });

    expect(parsed.success).toBe(true);
  });

  it.each([
    "2026-02-28",
    "2026-04-30",
    "2024-02-29",
    "2000-02-29",
  ])("accepts the calendar date %s without changing it", (performedDate) => {
    const parsed = intervalSessionSchema.parse({ ...validInput, performedDate });

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
    "19/08/2026",
    "2026-5-17",
    "2026-05-17T00:00:00.000Z",
    "2026-05-17\n",
    "not-a-date",
    "",
  ])("rejects invalid date %j without throwing", (performedDate) => {
    const parsed = intervalSessionSchema.safeParse({
      ...validInput,
      performedDate,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.performedDate).toEqual([
      "Use a valid date.",
    ]);
  });

  it.each(invalidCases)("rejects %s", (_label, overrides) => {
    const parsed = intervalSessionSchema.safeParse({
      ...validInput,
      ...overrides,
    });

    expect(parsed.success).toBe(false);
  });
});
