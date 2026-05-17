import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

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
  const skip = (page - 1) * limit;

  const where = {
    userId,
    exerciseId,
    exercise: {
      sessionKind: SessionKind.PACE,
    },
  };

  const [sessions, totalItems] = await Promise.all([
    prisma.paceSession.findMany({
      where,
      orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.paceSession.count({ where }),
  ]);

  return {
    sessions,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
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
