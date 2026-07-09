import { prisma } from "@/lib/db";
import { normalizePagination } from "@/features/logs/pagination";

export async function getLogsPage({
  userId,
  page,
  limit,
}: {
  userId: string;
  page: number;
  limit: number;
}) {
  const totalItems = await prisma.log.count({
    where: { userId },
  });
  const { skip, ...pagination } = normalizePagination({
    page,
    limit,
    totalItems,
  });

  const logs = await prisma.log.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    skip,
    take: pagination.limit,
  });

  return {
    logs,
    pagination,
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
