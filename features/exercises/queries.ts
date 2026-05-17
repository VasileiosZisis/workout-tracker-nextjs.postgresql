import { prisma } from "@/lib/db";

export async function getExercisesForLog({
  userId,
  logId,
}: {
  userId: string;
  logId: string;
}) {
  return prisma.exercise.findMany({
    where: {
      userId,
      logId,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
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
