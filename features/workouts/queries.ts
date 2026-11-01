import { prisma } from "@/lib/db";
import type { WorkoutSelection } from "./schema";

export async function getWorkoutPanel(userId: string, logId: string) {
  const routine = await prisma.workoutRoutine.findFirst({
    where: { userId, logId, log: { userId } },
    include: {
      definitions: { where: { archived: false }, orderBy: { position: "asc" } },
      entries: { where: { userId, logId, status: "IN_PROGRESS" }, include: {
        sessions: { where: { userId, logId, exercise: { userId, logId, sessionKind: "WEIGHTLIFTING" } },
          select: { id: true, exercise: { select: { title: true, slug: true } } }, orderBy: { createdAt: "asc" } },
      } },
    },
  });
  if (!routine) return null;
  const active = routine.entries[0];
  return {
    id: routine.id, name: routine.name, revision: routine.revision, nextId: routine.nextDefinitionId ?? "",
    definitions: routine.definitions.map(({ id, name }) => ({ id, name })),
    active: active ? { id: active.id, name: active.name, date: active.performedAt.toISOString().slice(0, 10), sessions: active.sessions } : null,
  };
}

export async function getWorkoutSelection(userId: string, logId: string): Promise<WorkoutSelection | null> {
  const panel = await getWorkoutPanel(userId, logId);
  if (!panel) return null;
  return {
    routineId: panel.id, revision: panel.revision, nextId: panel.nextId,
    nextName: panel.definitions.find((definition) => definition.id === panel.nextId)?.name ?? "",
    active: panel.active ? { id: panel.active.id, name: panel.active.name, date: panel.active.date } : null,
  };
}

export type WorkoutPanelData = Awaited<ReturnType<typeof getWorkoutPanel>>;
