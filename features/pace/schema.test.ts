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

  it("rejects invalid date format", () => {
    const parsed = paceSessionSchema.safeParse({
      performedDate: "17/05/2026",
      hours: "0",
      minutes: "25",
      seconds: "0",
      distance: "5",
    });

    expect(parsed.success).toBe(false);
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
