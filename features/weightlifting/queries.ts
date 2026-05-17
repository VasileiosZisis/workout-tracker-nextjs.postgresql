import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

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
  const skip = (page - 1) * limit;

  const where = {
    userId,
    exerciseId,
    exercise: {
      sessionKind: SessionKind.WEIGHTLIFTING,
    },
  };

  const [sessions, totalItems] = await Promise.all([
    prisma.weightliftingSession.findMany({
      where,
      orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.weightliftingSession.count({ where }),
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
