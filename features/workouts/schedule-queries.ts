import { prisma } from "@/lib/db";
import { normalizePagination } from "@/features/logs/pagination";
import { addDays, localDate, slotsForWeek, slotOutcome, snapshotSchema, startOfLocalDate, weekOf } from "./calendar";

export async function getScheduleContext(userId: string, logId: string, now = new Date()) {
  const routine = await prisma.workoutRoutine.findFirst({ where: { userId, logId, log: { userId } }, select: { id: true } });
  if (!routine) return null;
  const where = { routineId: routine.id };
  const [current, pending] = await Promise.all([
    prisma.workoutSchedule.findFirst({ where: { ...where, effectiveAt: { lte: now }, OR: [{ endAt: null }, { endAt: { gt: now } }] }, orderBy: [{ effectiveAt: "desc" }, { id: "desc" }] }),
    prisma.workoutSchedule.findFirst({ where: { ...where, effectiveAt: { gt: now } }, orderBy: { effectiveAt: "asc" } }),
  ]);
  const today = localDate(now, current?.timezone ?? "UTC");
  const weekStart = current?.weekStart ?? 1;
  const slots = current ? slotsForWeek(current, today) : [];
  const saved = current ? await prisma.workoutSlot.findMany({ where: { scheduleId: current.id, key: { in: slots.map((slot) => slot.key) } } }) : [];
  const choices = slots.map((slot) => ({ ...slot, scheduleId: current!.id, outcome: slotOutcome(slot, today, saved.find((row) => row.key === slot.key)) }));
  const next = choices.find((slot) => slot.outcome === "PENDING" && (current?.style !== "FIXED" || slot.date === today)) ?? null;
  const futureCandidates = [
    ...(current?.style === "FIXED" ? [...slotsForWeek(current, today), ...slotsForWeek(current, addDays(today, 7))].filter((slot) => slot.date > today).map((slot) => ({ ...slot, timezone: current.timezone, activation: current.effectiveAt.getTime() })) : []),
    ...(pending ? slotsForWeek(pending, pending.startDate).map((slot) => ({ ...slot, timezone: pending.timezone, activation: pending.effectiveAt.getTime() })) : []),
  ];
  const instants = new Map<string, number>();
  const future = futureCandidates.filter((slot) => !slot.superseded).map((slot) => {
    const key = `${slot.timezone}:${slot.date}`;
    if (!instants.has(key)) instants.set(key, startOfLocalDate(slot.date, slot.timezone).getTime());
    return { ...slot, availableAt: Math.max(instants.get(key)!, slot.activation) };
  }).filter((slot) => slot.availableAt > now.getTime()).sort((a, b) => a.availableAt - b.availableAt).at(0);
  return {
    id: current?.id ?? "", style: current?.style ?? "CONTINUOUS", timezone: current?.timezone ?? "UTC", weekStart, today,
    next, nextDate: future?.date ?? null, nextDateTimezone: future?.timezone ?? null, choices,
    assignments: current?.style === "FIXED" ? snapshotSchema.parse(current.workouts).map(({ definitionId, weekday }) => ({ definitionId, weekday: weekday! })) : [],
    pending: pending ? { id: pending.id, style: pending.style, date: pending.startDate, timezone: pending.timezone } : null,
    nextWeekDate: addDays(weekOf(today, weekStart), 7),
  };
}
export type ScheduleContext = NonNullable<Awaited<ReturnType<typeof getScheduleContext>>>;

export async function getScheduleWeek(userId: string, logId: string, date: string, page = 1, now = new Date(), controlPage = 1) {
  // Bounded by calendar week and version pagination, even after years away or
  // repeated edits within the same week. Reads do not materialize slots.
  const from = addDays(weekOf(date, 1), -6), through = addDays(from, 19);
  const where = { routine: { userId, logId, log: { userId } }, effectiveAt: { lte: now }, startDate: { lte: through }, OR: [{ endDate: null }, { endDate: { gte: from } }] };
  const receiptWhere = { userId, routine: { userId, logId, log: { userId } }, weekKey: { gte: addDays(date, -6), lte: date } };
  const [versionCount, receiptCount] = await Promise.all([prisma.workoutSchedule.count({ where }), prisma.workoutScheduleRequest.count({ where: receiptWhere })]);
  const { skip, ...pagination } = normalizePagination({ page, limit: 12, totalItems: versionCount });
  const { skip: controlSkip, ...controlPagination } = normalizePagination({ page: controlPage, limit: 12, totalItems: receiptCount });
  const versions = await prisma.workoutSchedule.findMany({ where, skip, take: pagination.limit, orderBy: [{ effectiveAt: "desc" }, { id: "desc" }] });
  const controls = await prisma.workoutScheduleRequest.findMany({ where: receiptWhere, skip: controlSkip, take: controlPagination.limit, orderBy: [{ outcomeDate: "desc" }, { id: "desc" }], select: { id: true, outcomeDate: true, name: true, operation: true, timezone: true } });
  const rows = await Promise.all(versions.map(async (plan) => {
    const slots = slotsForWeek(plan, date);
    const stored = await prisma.workoutSlot.findMany({ where: { scheduleId: plan.id, key: { in: slots.map((slot) => slot.key) } }, include: { entry: { select: { id: true, name: true, performedAt: true, schedulingIntent: true } } } });
    const today = localDate(now, plan.timezone);
    return slots.map((slot) => {
      const saved = stored.find((row) => row.key === slot.key);
      return { ...slot, scheduleId: plan.id, timezone: plan.timezone, style: plan.style, today,
        outcome: slotOutcome(slot, today, saved), originalOutcome: saved?.originalOutcome ?? null,
        entry: saved?.entry ? { ...saved.entry, performedDate: saved.entry.performedAt.toISOString().slice(0, 10) } : null };
    });
  }));
  return { rows: rows.flat().sort((a, b) => a.date.localeCompare(b.date) || a.scheduleId.localeCompare(b.scheduleId) || a.key.localeCompare(b.key)), controls, pagination, controlPagination };
}
