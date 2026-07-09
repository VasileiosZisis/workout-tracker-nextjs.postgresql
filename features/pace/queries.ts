import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { normalizePagination } from "@/features/logs/pagination";

export async function getPaceSessionsPage({
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
      sessionKind: SessionKind.PACE,
    },
  };

  const totalItems = await prisma.paceSession.count({ where });
  const { skip, ...pagination } = normalizePagination({
    page,
    limit,
    totalItems,
  });
  const sessions = await prisma.paceSession.findMany({
    where,
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    skip,
    take: pagination.limit,
  });

  return {
    sessions,
    pagination,
  };
}

export async function getPaceSessionById({
  userId,
  sessionId,
}: {
  userId: string;
  sessionId: string;
}) {
  return prisma.paceSession.findFirst({
    where: {
      id: sessionId,
      userId,
      exercise: {
        sessionKind: SessionKind.PACE,
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
}

export async function getLatestPaceSession({
  userId,
  exerciseId,
  excludeSessionId,
}: {
  userId: string;
  exerciseId: string;
  excludeSessionId?: string;
}) {
  return prisma.paceSession.findFirst({
    where: {
      userId,
      exerciseId,
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      exercise: {
        sessionKind: SessionKind.PACE,
      },
    },
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPaceExerciseBySlug({
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
      sessionKind: SessionKind.PACE,
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
