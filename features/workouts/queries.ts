import { prisma } from "@/lib/db";
import type { WorkoutSelection } from "./schema";
import { getScheduleContext } from "./schedule-queries";

export async function getRoutineNamesForLogs(userId: string, logIds: string[]) {
  if (logIds.length === 0) return new Map<string, string>();

  const routines = await prisma.workoutRoutine.findMany({
    where: { userId, logId: { in: logIds }, log: { userId } },
    select: { logId: true, name: true },
  });

  return new Map(routines.map(({ logId, name }) => [logId, name]));
}

export async function getWorkoutPanel(userId: string, logId: string) {
  const routine = await prisma.workoutRoutine.findFirst({
    where: { userId, logId, log: { userId } },
    include: {
      definitions: { where: { OR: [{ archived: false }, { entries: { some: { userId, logId, status: "IN_PROGRESS" } } }] }, orderBy: { position: "asc" }, include: {
        exercises: {
          where: { exercise: { userId, logId, sessionKind: "WEIGHTLIFTING" } },
          orderBy: [{ position: "asc" }, { id: "asc" }],
          select: { id: true, exercise: { select: { id: true, title: true, slug: true } } },
        },
      } },
      entries: { where: { userId, logId, status: "IN_PROGRESS" }, include: {
        sessions: { where: { userId, logId, exercise: { userId, logId, sessionKind: "WEIGHTLIFTING" } },
          select: { id: true, exercise: { select: { id: true, title: true, slug: true } } }, orderBy: { createdAt: "asc" } },
      } },
    },
  });
  if (!routine) return null;
  const schedule = await getScheduleContext(userId, logId);
  const active = routine.entries[0];
  return {
    id: routine.id, name: routine.name, revision: routine.revision, nextId: routine.nextDefinitionId ?? "", schedule,
    definitions: routine.definitions.map(({ id, name, exercises }) => ({ id, name, exercises })),
    active: active ? { id: active.id, slug: active.slug, definitionId: active.definitionId, name: active.name, date: active.performedAt.toISOString().slice(0, 10), sessions: active.sessions, plannedName: active.plannedName, scheduledDate: active.scheduledDate?.toISOString().slice(0, 10) ?? null } : null,
  };
}

export async function getWorkoutSelection(userId: string, logId: string): Promise<WorkoutSelection | null> {
  // Session forms need only selection context, not every remembered exercise.
  const routine = await prisma.workoutRoutine.findFirst({
    where: { userId, logId, log: { userId } },
    select: {
      id: true, revision: true, nextDefinitionId: true, nextDefinition: { select: { name: true } },
      entries: { where: { userId, logId, status: "IN_PROGRESS" }, select: { id: true, slug: true, name: true, performedAt: true }, take: 1 },
    },
  });
  if (!routine) return null;
  const schedule = await getScheduleContext(userId, logId);
  const active = routine.entries[0];
  return {
    routineId: routine.id, revision: routine.revision, nextId: routine.nextDefinitionId ?? "",
    nextName: routine.nextDefinition?.name ?? "",
    schedule,
    definitions: await prisma.workoutDefinition.findMany({ where: { routineId: routine.id, archived: false }, select: { id: true, name: true }, orderBy: { position: "asc" } }),
    active: active ? { id: active.id, slug: active.slug, name: active.name, date: active.performedAt.toISOString().slice(0, 10) } : null,
  };
}

export type WorkoutPanelData = Awaited<ReturnType<typeof getWorkoutPanel>>;

// The log needs only the pointer, schedule context, and active-session count.
export async function getWorkoutSummary(userId: string, logId: string) {
  const routine = await prisma.workoutRoutine.findFirst({
    where: { userId, logId, log: { userId } },
    select: {
      id: true, name: true, revision: true, nextDefinitionId: true,
      nextDefinition: { select: { name: true } },
      entries: { where: { userId, logId, status: "IN_PROGRESS" }, take: 1,
        select: { id: true, slug: true, name: true, _count: { select: { sessions: { where: { userId, logId, exercise: { userId, logId, sessionKind: "WEIGHTLIFTING" } } } } } } },
    },
  });
  if (!routine) return null;
  return { id: routine.id, name: routine.name, revision: routine.revision, nextId: routine.nextDefinitionId ?? "",
    nextName: routine.nextDefinition?.name ?? "", active: routine.entries.at(0) ?? null,
    schedule: await getScheduleContext(userId, logId) };
}

export async function getActiveWorkoutDetail(userId: string, logId: string, entryId: string) {
  const entry = await prisma.workoutEntry.findFirst({
    where: { id: entryId, userId, logId, status: "IN_PROGRESS", log: { userId }, routine: { userId, logId } },
    select: {
      id: true, name: true, performedAt: true, exercisePlanRevision: true,
      exercises: { where: { exercise: { userId, logId, sessionKind: "WEIGHTLIFTING" } }, orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true, exercise: { select: { id: true, title: true, slug: true } } } },
      definition: { select: { exercises: { where: { exercise: { userId, logId, sessionKind: "WEIGHTLIFTING" } },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true, exercise: { select: { id: true, title: true, slug: true } } } } } },
      sessions: { where: { userId, logId, exercise: { userId, logId, sessionKind: "WEIGHTLIFTING" } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, exercise: { select: { id: true, title: true, slug: true } } } },
    },
  });
  if (!entry) return null;
  return { id: entry.id, name: entry.name, exercisePlanRevision: entry.exercisePlanRevision,
    exercises: entry.exercisePlanRevision === null ? entry.definition.exercises : entry.exercises,
    sessions: entry.sessions, date: entry.performedAt.toISOString().slice(0, 10) };
}
