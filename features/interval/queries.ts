import { SessionKind } from "@/generated/prisma/enums";
import { normalizePagination } from "@/features/logs/pagination";
import { prisma } from "@/lib/db";
import { cache } from "react";

export async function getIntervalSessionsPage({
  userId,
  exerciseId,
  page,
  limit,
}: {
  userId: string;
  exerciseId: string;
  page: number;
  limit: number;
}) {
  const where = {
    userId,
    exerciseId,
    exercise: {
      userId,
      sessionKind: SessionKind.INTERVAL,
    },
  };

  const totalItems = await prisma.intervalSession.count({ where });
  const { skip, ...pagination } = normalizePagination({
    page,
    limit,
    totalItems,
  });
  const sessions = await prisma.intervalSession.findMany({
    where,
    orderBy: [
      { performedAt: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    skip,
    take: pagination.limit,
  });

  return {
    sessions,
    pagination,
  };
}

const findIntervalSessionById = cache(
  async (userId: string, exerciseId: string, sessionId: string) => {
    return prisma.intervalSession.findFirst({
      where: {
        id: sessionId,
        userId,
        exerciseId,
        exercise: {
          userId,
          sessionKind: SessionKind.INTERVAL,
        },
      },
      include: {
        exercise: {
          include: {
            log: true,
          },
        },
      },
    });
  },
);

export async function getIntervalSessionById({
  userId,
  exerciseId,
  sessionId,
}: {
  userId: string;
  exerciseId: string;
  sessionId: string;
}) {
  return findIntervalSessionById(userId, exerciseId, sessionId);
}

export async function getLatestIntervalSession({
  userId,
  exerciseId,
  excludeSessionId,
}: {
  userId: string;
  exerciseId: string;
  excludeSessionId?: string;
}) {
  return prisma.intervalSession.findFirst({
    where: {
      userId,
      exerciseId,
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      exercise: {
        userId,
        sessionKind: SessionKind.INTERVAL,
      },
    },
    orderBy: [
      { performedAt: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
  });
}

export async function getIntervalExerciseBySlug({
  userId,
  logSlug,
  exerciseSlug,
}: {
  userId: string;
  logSlug: string;
  exerciseSlug: string;
}) {
  return prisma.exercise.findFirst({
    where: {
      userId,
      slug: exerciseSlug,
      sessionKind: SessionKind.INTERVAL,
      log: {
        userId,
        slug: logSlug,
      },
    },
    include: {
      log: true,
    },
  });
}
