import { performedDateSchema, requestIdSchema, routineSchema } from "./schema";

const valid = { name: "My split", revision: 0, workouts: [{ id: "new:A", name: "A" }], nextId: "new:A" };

describe("workout input", () => {
  it("accepts a single workout and trims names", () => {
    expect(routineSchema.parse({ ...valid, name: " Split " }).name).toBe("Split");
  });
  it("accepts thirty ordered workouts", () => {
    expect(routineSchema.safeParse({ ...valid, workouts: Array.from({ length: 30 }, (_, i) => ({ id: `new:${i}`, name: `Workout ${i}` })), nextId: "new:29" }).success).toBe(true);
  });
  it.each([
    { workouts: [] }, { name: " " }, { name: "A".repeat(81) }, { revision: -1 },
    { nextId: "foreign" }, { workouts: [{ id: "new:A", name: "A" }, { id: "new:A", name: "B" }] },
    { workouts: Array.from({ length: 31 }, (_, i) => ({ id: `new:${i}`, name: "A" })) },
  ])("rejects invalid routine details: %j", (override) => {
    expect(routineSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
  it.each(["2026-02-30", "2026-13-01", "2026-1-1", "invalid"])("rejects invalid date %s", (date) => {
    expect(performedDateSchema.safeParse(date).success).toBe(false);
  });
  it("requires a valid request identifier", () => {
    expect(requestIdSchema.safeParse("not-a-request").success).toBe(false);
  });
});
