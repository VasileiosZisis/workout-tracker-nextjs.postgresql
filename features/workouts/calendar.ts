import { z } from "zod";

export const scheduleStyle = z.enum(["CONTINUOUS", "WEEKLY", "FIXED"]);
export const timezoneSchema = z.string().max(100).refine((value) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}, "Choose a valid timezone.");
export const snapshotSchema = z.array(z.object({ definitionId: z.string().min(1), name: z.string().min(1), weekday: z.number().int().min(0).max(6).optional() })).min(1).max(30);
export type PlanWorkout = z.infer<typeof snapshotSchema>[number];
export type SchedulePlan = {
  id: string; style: string; timezone: string; weekStart: number;
  startDate: string; endDate: string | null; workouts: unknown;
};
export type PlannedSlot = { key: string; date: string; expires: string; definitionId: string; name: string; superseded: boolean };

export function localDate(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export const dateValue = (date: string) => new Date(`${date}T00:00:00.000Z`);
export function addDays(date: string, days: number) {
  const value = dateValue(date); value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function weekOf(date: string, first: number) {
  return addDays(date, -((dateValue(date).getUTCDay() - first + 7) % 7));
}
// First instant of a calendar date in a zone, including DST and midnight offset
// transitions. No dependency on the host timezone or 24-hour local-day arithmetic.
export function startOfLocalDate(date: string, timezone: string) {
  const center = dateValue(date).getTime();
  let low = center - 36 * 3600000, high = center + 36 * 3600000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (localDate(new Date(middle), timezone) < date) low = middle; else high = middle;
  }
  return new Date(high);
}

export function slotsForWeek(plan: SchedulePlan, date: string): PlannedSlot[] {
  if (plan.style === "CONTINUOUS") return [];
  const week = weekOf(date, plan.weekStart), next = addDays(week, 7);
  if (next <= plan.startDate || (plan.endDate && week > plan.endDate)) return [];
  const workouts = snapshotSchema.parse(plan.workouts);
  if (plan.style === "WEEKLY") {
    return workouts.map((workout, index) => ({
      ...workout, key: `${week}:${index}`, date: week < plan.startDate ? plan.startDate : week,
      expires: next, superseded: !!plan.endDate && plan.endDate < next,
    }));
  }
  return workouts.flatMap((workout) => {
    if (workout.weekday === undefined) return [];
    const scheduled = addDays(week, (workout.weekday - plan.weekStart + 7) % 7);
    if (scheduled < plan.startDate) return [];
    return [{ ...workout, key: scheduled, date: scheduled, expires: addDays(scheduled, 1), superseded: !!plan.endDate && scheduled >= plan.endDate }];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function slotOutcome(slot: PlannedSlot, today: string, stored?: { outcome: string; entryId: string | null }) {
  if (stored?.outcome === "COMPLETED") return "COMPLETED";
  if (stored?.entryId) return "IN_PROGRESS";
  if (stored?.outcome === "SKIPPED") return "SKIPPED";
  if (slot.superseded) return "SUPERSEDED";
  return today >= slot.expires ? "MISSED" : "PENDING";
}
