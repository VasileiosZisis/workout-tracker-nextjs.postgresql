import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { lockWorkoutContext, WorkoutError } from "./service";
import { performedDateSchema, requestIdSchema } from "./schema";
import { addDays, dateValue, localDate, scheduleStyle, slotsForWeek, slotOutcome, startOfLocalDate, timezoneSchema, weekOf } from "./calendar";

type Tx = Prisma.TransactionClient;
type Context = NonNullable<Awaited<ReturnType<typeof lockWorkoutContext>>>;
export const scheduleSettingsSchema = z.object({
  routineId: z.string().min(1), revision: z.coerce.number().int().min(0),
  style: scheduleStyle, timezone: timezoneSchema, weekStart: z.coerce.number().int().min(0).max(6),
  effective: z.enum(["today", "nextWeek"]), confirmed: z.literal("yes"),
  expectedScheduleId: z.string().max(100), expectedToday: performedDateSchema,
  assignments: z.array(z.object({ weekday: z.number().int().min(0).max(6), definitionId: z.string().min(1) })).max(7),
});
export const schedulingInputSchema = z.object({
  intent: z.enum(["ROTATION", "SCHEDULED", "MAKEUP", "EXTRA"]).default("ROTATION"),
  scheduleId: z.string().max(100).default(""), slotKey: z.string().max(100).default(""),
  definitionId: z.string().max(100).default(""), today: performedDateSchema.optional(),
});
export type SchedulingInput = z.input<typeof schedulingInputSchema>;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const schedulingFingerprint = (value: unknown) => hash(value);

export async function currentSchedule(tx: Tx, routineId: string, now = new Date()) {
  return tx.workoutSchedule.findFirst({ where: { routineId, effectiveAt: { lte: now }, OR: [{ endAt: null }, { endAt: { gt: now } }] }, orderBy: [{ effectiveAt: "desc" }, { id: "desc" }] });
}
function assertIdle(routine: Context | null, id: string, revision: number): asserts routine is Context {
  if (!routine || routine.id !== id || routine.revision !== revision) throw new WorkoutError("The routine changed. Reload before continuing.");
  if (routine.entries.length) throw new WorkoutError("Finish or discard the active workout first.");
}

export async function saveSchedule(userId: string, logId: string, raw: unknown, now = new Date()) {
  const input = scheduleSettingsSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const routine = await lockWorkoutContext(tx, userId, logId);
    assertIdle(routine, input.routineId, input.revision);
    const current = await currentSchedule(tx, routine.id, now);
    if ((current?.id ?? "") !== input.expectedScheduleId || input.expectedToday !== localDate(now, current?.timezone ?? "UTC")) throw new WorkoutError("The schedule date changed. Reload settings before saving.");
    const baseZone = current?.timezone ?? input.timezone;
    const today = localDate(now, baseZone);
    const effectiveDate = input.effective === "today" ? today : addDays(weekOf(today, current?.weekStart ?? input.weekStart), 7);
    const effectiveAt = input.effective === "today" ? now : startOfLocalDate(effectiveDate, baseZone);
    const defs = new Map(routine.definitions.map((item) => [item.id, item]));
    if (new Set(input.assignments.map((item) => item.weekday)).size !== input.assignments.length) throw new WorkoutError("Assign only one workout per weekday.");
    if (input.assignments.some((item) => !defs.has(item.definitionId))) throw new WorkoutError("Choose current workouts for weekday assignments.");
    if (input.style === "FIXED" && !input.assignments.length) throw new WorkoutError("Assign at least one weekday.");
    // An unactivated version has no entries or outcomes and can be replaced.
    await tx.workoutSchedule.deleteMany({ where: { routineId: routine.id, effectiveAt: { gt: now } } });
    if (current) await tx.workoutSchedule.update({ where: { id: current.id }, data: { endAt: effectiveAt, endDate: effectiveDate } });
    const workouts = input.style === "FIXED"
      ? input.assignments.map((item) => ({ definitionId: item.definitionId, name: defs.get(item.definitionId)!.name, weekday: item.weekday }))
      : routine.definitions.map((item) => ({ definitionId: item.id, name: item.name }));
    await tx.workoutSchedule.create({ data: {
      routineId: routine.id, style: input.style, timezone: input.timezone, weekStart: input.weekStart,
      effectiveAt, startDate: localDate(effectiveAt, input.timezone), workouts,
    } });
    await tx.workoutRoutine.update({ where: { id: routine.id }, data: { revision: { increment: 1 } } });
  });
}

export async function cancelSchedule(userId: string, logId: string, routineId: string, revision: number, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const routine = await lockWorkoutContext(tx, userId, logId);
    assertIdle(routine, routineId, revision);
    const removed = await tx.workoutSchedule.deleteMany({ where: { routineId, effectiveAt: { gt: now } } });
    if (!removed.count) throw new WorkoutError("There is no pending schedule change. Reload the page.");
    const current = await currentSchedule(tx, routineId, now);
    if (current) await tx.workoutSchedule.update({ where: { id: current.id }, data: { endAt: null, endDate: null } });
    await tx.workoutRoutine.update({ where: { id: routineId }, data: { revision: { increment: 1 } } });
  });
}

export async function resolveSlot(tx: Tx, routine: Context, scheduleId: string, key: string, now = new Date()) {
  const plan = await tx.workoutSchedule.findFirst({ where: { id: scheduleId, routineId: routine.id, effectiveAt: { lte: now } } });
  if (!plan || plan.style === "CONTINUOUS") throw new WorkoutError("Scheduled workout not found.");
  const date = performedDateSchema.parse(key.slice(0, 10));
  const slot = slotsForWeek(plan, date).find((item) => item.key === key);
  if (!slot) throw new WorkoutError("Choose a valid scheduled slot.");
  const stored = await tx.workoutSlot.findUnique({ where: { scheduleId_key: { scheduleId, key } } });
  const today = localDate(now, plan.timezone);
  return { plan, slot, stored, today, outcome: slotOutcome(slot, today, stored ?? undefined) };
}

export async function prepareScheduledEntry(tx: Tx, routine: Context, raw: SchedulingInput, date: string, now = new Date()) {
  const input = schedulingInputSchema.parse(raw);
  const current = await currentSchedule(tx, routine.id, now);
  if (input.intent === "ROTATION") {
    if (current && current.style !== "CONTINUOUS") throw new WorkoutError("The schedule changed. Choose a scheduled or extra workout.");
    if (current && (input.scheduleId !== current.id || input.today !== localDate(now, current.timezone))) throw new WorkoutError("The schedule date changed. Reload before starting.");
    if (current && date !== localDate(now, current.timezone)) throw new WorkoutError("Use Extra workout for a different performed date; it leaves today's rotation unchanged.");
    const planned = routine.definitions.find((item) => item.id === routine.nextDefinitionId);
    const chosen = routine.definitions.find((item) => item.id === (input.definitionId || routine.nextDefinitionId));
    if (!planned || !chosen) throw new WorkoutError("Choose a current workout.");
    return { definitionId: chosen.id, name: chosen.name, plannedName: planned.name, schedulingIntent: "ROTATION", scheduleId: current?.id ?? null };
  }
  if (input.intent === "EXTRA") {
    if ((current?.id ?? "") !== input.scheduleId || (current && input.today !== localDate(now, current.timezone))) throw new WorkoutError("The schedule changed. Reload before starting.");
    const definition = routine.definitions.find((item) => item.id === input.definitionId);
    if (!definition) throw new WorkoutError("Choose a current workout for extra training.");
    return { definitionId: definition.id, name: definition.name, schedulingIntent: "EXTRA", scheduleId: current?.id ?? null };
  }
  const resolved = await resolveSlot(tx, routine, input.scheduleId, input.slotKey, now);
  const { plan, slot, stored, today, outcome } = resolved;
  if (stored?.entryId || outcome === "COMPLETED" || outcome === "SUPERSEDED") throw new WorkoutError("This slot is already claimed, completed, or superseded.");
  if (input.intent === "MAKEUP") {
    if (outcome !== "MISSED" && outcome !== "SKIPPED") throw new WorkoutError("Choose a missed or skipped slot to make up.");
    if (date < slot.date || date > today) throw new WorkoutError("Choose a performed date from the scheduled date through today.");
  } else {
    if (plan.id !== current?.id || input.today !== today || date !== today || outcome !== "PENDING") throw new WorkoutError("The scheduled date changed. Reload or explicitly choose a make-up workout.");
    if (plan.style === "FIXED" && slot.date !== today) throw new WorkoutError("Choose today's scheduled workout.");
    if (plan.style === "WEEKLY") {
      const saved = await tx.workoutSlot.findMany({ where: { scheduleId: plan.id, key: { startsWith: `${weekOf(today, plan.weekStart)}:` } } });
      const next = slotsForWeek(plan, today).find((item) => slotOutcome(item, today, saved.find((row) => row.key === item.key)) === "PENDING");
      if (next?.key !== slot.key) throw new WorkoutError("The next weekly workout changed. Reload the page.");
    }
  }
  const definitionId = input.definitionId || slot.definitionId;
  const definition = await tx.workoutDefinition.findFirst({ where: { id: definitionId, routineId: routine.id, ...(definitionId !== slot.definitionId ? { archived: false } : {}) } });
  if (!definition) throw new WorkoutError("Choose an eligible workout.");
  return { definitionId, name: definitionId === slot.definitionId ? slot.name : definition.name,
    schedulingIntent: input.intent, scheduleId: plan.id, slotKey: slot.key,
    plannedName: slot.name, scheduledDate: dateValue(slot.date) };
}

export async function historicalSlotData(tx: Tx, routine: Context, scheduleId: string, key: string, date: string, now = new Date()) {
  const { plan, slot, stored, outcome, today } = await resolveSlot(tx, routine, scheduleId, key, now);
  if (stored?.entryId || !["PENDING", "MISSED", "SKIPPED"].includes(outcome)) throw new WorkoutError("Choose an unfulfilled scheduled slot.");
  if (date < slot.date || date > today || (outcome === "PENDING" && (date >= slot.expires || (plan.style === "FIXED" && date !== slot.date)))) throw new WorkoutError("The selected slot does not match the performed date.");
  return { scheduleId, slotKey: key, plannedName: slot.name, scheduledDate: dateValue(slot.date), schedulingIntent: "HISTORICAL" };
}

export async function claimEntrySlot(tx: Tx, routine: Context, entry: { id: string; scheduleId: string | null; slotKey: string | null }, completed: boolean, now = new Date()) {
  if (!entry.scheduleId || !entry.slotKey) return;
  const { stored, outcome } = await resolveSlot(tx, routine, entry.scheduleId, entry.slotKey, now);
  if (stored?.entryId && stored.entryId !== entry.id) throw new WorkoutError("This scheduled slot was claimed by another workout.");
  if (stored?.outcome === "COMPLETED" && stored.entryId !== entry.id) throw new WorkoutError("This scheduled slot is already completed.");
  const originalOutcome = stored?.originalOutcome ?? (outcome === "MISSED" || outcome === "SKIPPED" ? outcome : null);
  await tx.workoutSlot.upsert({ where: { scheduleId_key: { scheduleId: entry.scheduleId, key: entry.slotKey } },
    create: { scheduleId: entry.scheduleId, key: entry.slotKey, entryId: entry.id, outcome: completed ? "COMPLETED" : stored?.outcome ?? "PENDING", originalOutcome },
    update: { entryId: entry.id, ...(completed ? { outcome: "COMPLETED" } : {}), originalOutcome },
  });
}

export async function scheduleControl(userId: string, logId: string, raw: {
  routineId: string; revision: number; requestId: string; operation: "skip" | "reset";
  scheduleId: string; slotKey: string; today: string; nextId: string;
}, now = new Date()) {
  requestIdSchema.parse(raw.requestId); performedDateSchema.parse(raw.today);
  const fingerprint = hash(raw);
  return prisma.$transaction(async (tx) => {
    const routine = await lockWorkoutContext(tx, userId, logId);
    const prior = await tx.workoutScheduleRequest.findUnique({ where: { userId_requestId: { userId, requestId: raw.requestId } } });
    if (prior) { if (prior.routineId !== routine?.id || prior.fingerprint !== fingerprint) throw new WorkoutError("This request was already used. Reload."); return; }
    assertIdle(routine, raw.routineId, raw.revision);
    const current = await currentSchedule(tx, routine.id, now);
    if ((current?.id ?? "") !== raw.scheduleId || raw.today !== localDate(now, current?.timezone ?? "UTC")) throw new WorkoutError("The schedule date changed. Reload the page.");
    if (!current || current.style === "CONTINUOUS") {
      if (routine.nextDefinitionId !== raw.nextId) throw new WorkoutError("The next workout changed. Reload.");
      const position = routine.definitions.findIndex((item) => item.id === routine.nextDefinitionId);
      await tx.workoutRoutine.update({ where: { id: routine.id }, data: { nextDefinitionId: routine.definitions[raw.operation === "reset" ? 0 : (position + 1) % routine.definitions.length].id } });
    } else if (raw.operation === "skip") {
      const { slot, stored, outcome, today } = await resolveSlot(tx, routine, current.id, raw.slotKey, now);
      if (outcome !== "PENDING" || stored?.entryId || (current.style === "FIXED" && slot.date !== today) || weekOf(slot.date, current.weekStart) !== weekOf(today, current.weekStart)) throw new WorkoutError("Choose an unresolved current slot.");
      await tx.workoutSlot.upsert({ where: { scheduleId_key: { scheduleId: current.id, key: slot.key } }, create: { scheduleId: current.id, key: slot.key, outcome: "SKIPPED" }, update: { outcome: "SKIPPED" } });
    } else {
      if (current.style !== "WEEKLY") throw new WorkoutError("Edit weekday assignments to change this schedule.");
      if (await tx.workoutSchedule.count({ where: { routineId: routine.id, effectiveAt: { gt: now } } })) throw new WorkoutError("Resolve the pending schedule change before confirming a weekly reset.");
      // Weekly reset is an explicit confirmation of next week's natural reset.
      // It never consumes or restarts this week's slots.
    }
    await tx.workoutScheduleRequest.create({ data: { routineId: routine.id, userId, requestId: raw.requestId, fingerprint,
      ...(!current || current.style === "CONTINUOUS" ? { outcomeDate: raw.today, name: routine.definitions.find((item) => item.id === raw.nextId)?.name, operation: raw.operation } : {}),
      ...(!current || current.style === "CONTINUOUS" ? { weekKey: weekOf(raw.today, current?.weekStart ?? 1), timezone: current?.timezone ?? "UTC" } : {}),
    } });
    await tx.workoutRoutine.update({ where: { id: routine.id }, data: { revision: { increment: 1 } } });
  });
}
