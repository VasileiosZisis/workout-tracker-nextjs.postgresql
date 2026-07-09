import { prisma } from "@/lib/db";
import { normalizePagination } from "@/features/logs/pagination";

export async function getExercisesPage({
  userId,
  logId,
  page,
  limit,
}: {
  userId: string;
  logId: string;
  page: number;
  limit: number;
}) {
  const where = { userId, logId };
  const totalItems = await prisma.exercise.count({ where });
  const { skip, ...pagination } = normalizePagination({
    page,
    limit,
    totalItems,
  });
  const exercises = await prisma.exercise.findMany({
    where,
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    skip,
    take: pagination.limit,
  });

  return {
    exercises,
    pagination,
  };
}

export async function getExerciseBySlug({
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

export async function getExistingExerciseSlugs({
  userId,
  logId,
}: {
  userId: string;
  logId: string;
}) {
  const exercises = await prisma.exercise.findMany({
    where: {
      userId,
      logId,
    },
    select: { slug: true },
  });

  return exercises.map((exercise) => exercise.slug);
}
