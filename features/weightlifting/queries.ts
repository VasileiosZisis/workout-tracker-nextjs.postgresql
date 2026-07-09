import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { normalizePagination } from "@/features/logs/pagination";

export async function getWeightliftingSessionsPage({
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
      sessionKind: SessionKind.WEIGHTLIFTING,
    },
  };

  const totalItems = await prisma.weightliftingSession.count({ where });
  const { skip, ...pagination } = normalizePagination({
    page,
    limit,
    totalItems,
  });
  const sessions = await prisma.weightliftingSession.findMany({
    where,
    include: {
      _count: {
        select: {
          sets: {
            where: {
              isHard: true,
            },
          },
        },
      },
    },
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    skip,
    take: pagination.limit,
  });

  return {
    sessions,
    pagination,
  };
}

export async function getWeightliftingSessionById({
  userId,
  sessionId,
}: {
  userId: string;
  sessionId: string;
}) {
  return prisma.weightliftingSession.findFirst({
    where: {
      id: sessionId,
      userId,
      exercise: {
        sessionKind: SessionKind.WEIGHTLIFTING,
      },
    },
    include: {
      exercise: {
        include: {
          log: true,
        },
      },
      sets: {
        orderBy: { position: "asc" },
      },
    },
  });
}

export async function getLatestWeightliftingSession({
  userId,
  exerciseId,
  excludeSessionId,
}: {
  userId: string;
  exerciseId: string;
  excludeSessionId?: string;
}) {
  return prisma.weightliftingSession.findFirst({
    where: {
      userId,
      exerciseId,
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      exercise: {
        sessionKind: SessionKind.WEIGHTLIFTING,
      },
    },
    include: {
      sets: {
        orderBy: { position: "asc" },
      },
    },
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getWeightliftingExerciseBySlug({
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
      sessionKind: SessionKind.WEIGHTLIFTING,
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
