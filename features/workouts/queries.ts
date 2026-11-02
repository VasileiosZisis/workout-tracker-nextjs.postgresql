import { prisma } from "@/lib/db";
import type { WorkoutSelection } from "./schema";
import { getScheduleContext } from "./schedule-queries";

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
    active: active ? { id: active.id, definitionId: active.definitionId, name: active.name, date: active.performedAt.toISOString().slice(0, 10), sessions: active.sessions, plannedName: active.plannedName, scheduledDate: active.scheduledDate?.toISOString().slice(0, 10) ?? null } : null,
  };
}

export async function getWorkoutSelection(userId: string, logId: string): Promise<WorkoutSelection | null> {
  // Session forms need only selection context, not every remembered exercise.
  const routine = await prisma.workoutRoutine.findFirst({
    where: { userId, logId, log: { userId } },
    select: {
      id: true, revision: true, nextDefinitionId: true, nextDefinition: { select: { name: true } },
      entries: { where: { userId, logId, status: "IN_PROGRESS" }, select: { id: true, name: true, performedAt: true }, take: 1 },
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
    active: active ? { id: active.id, name: active.name, date: active.performedAt.toISOString().slice(0, 10) } : null,
  };
}

export type WorkoutPanelData = Awaited<ReturnType<typeof getWorkoutPanel>>;
