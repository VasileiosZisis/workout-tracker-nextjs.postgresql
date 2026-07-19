import { prisma } from "@/lib/db";

export async function deleteExpiredDemoUsers(now = new Date()) {
  return prisma.user.deleteMany({
    where: {
      demoExpiresAt: {
        lte: now,
      },
    },
  });
}

export async function deleteDemoUser(userId: string) {
  return prisma.user.deleteMany({
    where: {
      id: userId,
      demoExpiresAt: {
        not: null,
      },
    },
  });
}
