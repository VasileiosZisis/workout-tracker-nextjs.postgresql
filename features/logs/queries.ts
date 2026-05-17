import { prisma } from "@/lib/db";

export async function getLogsPage({
  userId,
  page,
  limit,
}: {
  userId: string;
  page: number;
  limit: number;
}) {
  const skip = (page - 1) * limit;

  const [logs, totalItems] = await Promise.all([
    prisma.log.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.log.count({
      where: { userId },
    }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
  };
}

export async function getLogBySlug({
  userId,
  slug,
}: {
  userId: string;
  slug: string;
}) {
  return prisma.log.findUnique({
    where: {
      userId_slug: {
        userId,
        slug,
      },
    },
  });
}

export async function getExistingLogSlugs(userId: string) {
  const logs = await prisma.log.findMany({
    where: { userId },
    select: { slug: true },
  });

  return logs.map((log) => log.slug);
}
