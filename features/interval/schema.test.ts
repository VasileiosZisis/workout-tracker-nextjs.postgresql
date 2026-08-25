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
  ["an invalid date", { performedDate: "19/08/2026" }],
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

  it.each(invalidCases)("rejects %s", (_label, overrides) => {
    const parsed = intervalSessionSchema.safeParse({
      ...validInput,
      ...overrides,
    });

    expect(parsed.success).toBe(false);
  });
});
