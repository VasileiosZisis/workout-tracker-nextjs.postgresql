import { prisma } from "@/lib/db";
import { normalizePagination } from "@/features/logs/pagination";
import type { Prisma } from "@/generated/prisma/client";

const ownedEntry = (userId: string, logId: string): Prisma.WorkoutEntryWhereInput => ({
  userId, logId, log: { userId }, routine: { userId, logId },
});
const ownedSession = (userId: string, logId: string): Prisma.WeightliftingSessionWhereInput => ({
  userId, logId, log: { userId }, exercise: { userId, logId, sessionKind: "WEIGHTLIFTING" },
});

export async function getHistoryRoutine(userId: string, logId: string) {
  return prisma.workoutRoutine.findFirst({
    where: { userId, logId, log: { userId } },
    select: { id: true, revision: true, definitions: { where: { archived: false }, orderBy: { position: "asc" }, select: { id: true, name: true } } },
  });
}

export async function getWorkoutHistoryPage(userId: string, logId: string, page: number, limit: number) {
  const where: Prisma.WorkoutEntryWhereInput = { ...ownedEntry(userId, logId), status: "COMPLETED" };
  const totalItems = await prisma.workoutEntry.count({ where });
  const { skip, ...pagination } = normalizePagination({ page, limit, totalItems });
  const entries = await prisma.workoutEntry.findMany({
    where, orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }], skip, take: pagination.limit,
    select: { id: true, name: true, performedAt: true, _count: { select: { sessions: { where: ownedSession(userId, logId) } } } },
  });
  return { entries, pagination };
}

export async function getWorkoutHistoryDetail(userId: string, logId: string, entryId: string, page: number, limit: number) {
  const entry = await prisma.workoutEntry.findFirst({
    where: { ...ownedEntry(userId, logId), id: entryId, status: { in: ["IN_PROGRESS", "COMPLETED"] } },
    select: { id: true, name: true, performedAt: true, status: true, plannedName: true, scheduledDate: true, schedulingIntent: true },
  });
  if (!entry) return null;
  const where = { ...ownedSession(userId, logId), workoutEntryId: entry.id };
  const totalItems = await prisma.weightliftingSession.count({ where });
  const { skip, ...pagination } = normalizePagination({ page, limit, totalItems });
  const sessions = await prisma.weightliftingSession.findMany({
    where, skip, take: pagination.limit, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, exercise: { select: { title: true, slug: true } } },
  });
  return { entry, sessions, pagination };
}

export async function getStandaloneSessionPage(userId: string, logId: string, date: string, page: number, limit: number) {
  const where = { ...ownedSession(userId, logId), workoutEntryId: null, performedAt: new Date(`${date}T00:00:00.000Z`) };
  const totalItems = await prisma.weightliftingSession.count({ where });
  const { skip, ...pagination } = normalizePagination({ page, limit, totalItems });
  const sessions = await prisma.weightliftingSession.findMany({
    where, skip, take: pagination.limit, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, exercise: { select: { title: true, slug: true } }, _count: { select: { sets: true } } },
  });
  return { sessions, pagination };
}

export async function getSessionWorkoutCandidates(userId: string, logId: string, performedAt: Date, currentEntryId: string | null, page: number, limit: number) {
  const where: Prisma.WorkoutEntryWhereInput = {
    ...ownedEntry(userId, logId), performedAt, status: { in: ["IN_PROGRESS", "COMPLETED"] },
    ...(currentEntryId ? { id: { not: currentEntryId } } : {}),
  };
  const totalItems = await prisma.workoutEntry.count({ where });
  const { skip, ...pagination } = normalizePagination({ page, limit, totalItems });
  const entries = await prisma.workoutEntry.findMany({
    where, skip, take: pagination.limit, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, status: true },
  });
  return { entries, pagination };
}
