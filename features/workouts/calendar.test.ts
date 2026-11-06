import { addDays, localDate, slotOutcome, slotsForWeek, startOfLocalDate, weekOf, timezoneSchema } from "./calendar";

const plan = { id: "plan", style: "WEEKLY", timezone: "America/New_York", weekStart: 1, startDate: "2026-10-26", endDate: null, workouts: ["A", "B", "C"].map((name) => ({ definitionId: name, name })) };
describe("schedule calendar dates", () => {
  it("uses the routine zone across UTC dates and daylight saving", () => {
    expect(localDate(new Date("2026-11-02T01:00:00Z"), "America/New_York")).toBe("2026-11-01");
    expect(localDate(new Date("2026-11-01T06:30:00Z"), "America/New_York")).toBe("2026-11-01");
    expect(startOfLocalDate("2026-11-01", "America/New_York").toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(startOfLocalDate("2026-11-02", "America/New_York").toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(startOfLocalDate("2026-03-09", "America/New_York").toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(timezoneSchema.safeParse("Not/A_Zone").success).toBe(false);
  });
  it("supports arbitrary week starts and calendar year boundaries", () => {
    expect(weekOf("2027-01-01", 1)).toBe("2026-12-28");
    expect(weekOf("2027-01-01", 0)).toBe("2026-12-27");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("expires weekly slots only at the next local week and never loops twice", () => {
    const slots = slotsForWeek(plan, "2026-10-30");
    expect(slots).toHaveLength(3);
    expect(slotOutcome(slots[2], "2026-11-01")).toBe("PENDING");
    expect(slotOutcome(slots[2], "2026-11-02")).toBe("MISSED");
    expect(slotsForWeek(plan, "2040-01-01")).toHaveLength(3);
    expect(slotsForWeek(plan, "2026-11-02")[0].key).not.toBe(slots[0].key);
  });
  it("fixed weekdays produce no rest-day slots and do not shift after misses", () => {
    const slots = slotsForWeek({ ...plan, style: "FIXED", workouts: [{ definitionId: "B", name: "B", weekday: 2 }, { definitionId: "C", name: "C", weekday: 4 }] }, "2026-10-29");
    expect(slots.map((slot) => slot.date)).toEqual(["2026-10-27", "2026-10-29"]);
    expect(slotOutcome(slots[0], "2026-10-29")).toBe("MISSED");
    expect(slotOutcome(slots[1], "2026-10-29")).toBe("PENDING");
  });
  it("preserves claims and outcomes when superseding a partial week", () => {
    const slot = slotsForWeek({ ...plan, endDate: "2026-10-29" }, "2026-10-29")[0];
    expect(slotOutcome(slot, "2026-10-30")).toBe("SUPERSEDED");
    expect(slotOutcome(slot, "2026-10-30", { outcome: "COMPLETED", entryId: "entry" })).toBe("COMPLETED");
    expect(slotOutcome(slot, "2026-10-30", { outcome: "SKIPPED", entryId: null })).toBe("SKIPPED");
    expect(slotsForWeek({ ...plan, startDate: "2026-10-29" }, "2026-10-28")[0].date).toBe("2026-10-29");
    expect(slotsForWeek({ ...plan, style: "CONTINUOUS" }, "2026-10-29")).toEqual([]);
  });
});
