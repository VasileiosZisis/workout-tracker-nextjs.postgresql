import { paceSessionSchema } from "./schema";

describe("paceSessionSchema", () => {
  it("accepts a valid pace session", () => {
    const parsed = paceSessionSchema.safeParse({
      performedDate: "2026-05-17",
      hours: "0",
      minutes: "25",
      seconds: "0",
      distance: "5",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts zero distance when time is present", () => {
    const parsed = paceSessionSchema.safeParse({
      performedDate: "2026-05-17",
      hours: "0",
      minutes: "25",
      seconds: "0",
      distance: "0",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts zero time when distance is present", () => {
    const parsed = paceSessionSchema.safeParse({
      performedDate: "2026-05-17",
      hours: "0",
      minutes: "0",
      seconds: "0",
      distance: "5",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects all-zero sessions", () => {
    const parsed = paceSessionSchema.safeParse({
      performedDate: "2026-05-17",
      hours: "0",
      minutes: "0",
      seconds: "0",
      distance: "0",
    });

    expect(parsed.success).toBe(false);
  });

  it.each([
    "2026-02-28",
    "2026-04-30",
    "2024-02-29",
    "2000-02-29",
  ])("accepts the calendar date %s without changing it", (performedDate) => {
    const parsed = paceSessionSchema.parse({
      performedDate,
      hours: "0",
      minutes: "25",
      seconds: "0",
      distance: "5",
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
    const parsed = paceSessionSchema.safeParse({
      performedDate,
      hours: "0",
      minutes: "25",
      seconds: "0",
      distance: "5",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.performedDate).toEqual([
      "Use a valid date.",
    ]);
  });

  it("rejects invalid minute ranges", () => {
    const parsed = paceSessionSchema.safeParse({
      performedDate: "2026-05-17",
      hours: "0",
      minutes: "60",
      seconds: "0",
      distance: "5",
    });

    expect(parsed.success).toBe(false);
  });
});
