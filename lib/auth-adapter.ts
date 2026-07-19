import type { Adapter, AdapterUser } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { deleteDemoUser } from "@/features/demo/lifecycle";
import { prisma } from "@/lib/db";

const baseAdapter = PrismaAdapter(prisma);

export const authAdapter: Adapter = {
  ...baseAdapter,
  async getSessionAndUser(sessionToken) {
    const result = await baseAdapter.getSessionAndUser!(sessionToken);
    const demoExpiresAt = (
      result?.user as (AdapterUser & { demoExpiresAt?: Date | null }) | undefined
    )?.demoExpiresAt;

    if (result && demoExpiresAt && demoExpiresAt.getTime() <= Date.now()) {
      await deleteDemoUser(result.user.id);
      return null;
    }

    return result;
  },
  async updateSession(session) {
    const existing = await prisma.session.findUnique({
      where: { sessionToken: session.sessionToken },
      include: {
        user: {
          select: {
            demoExpiresAt: true,
          },
        },
      },
    });

    if (existing?.user.demoExpiresAt) {
      if (existing.user.demoExpiresAt.getTime() <= Date.now()) {
        await deleteDemoUser(existing.userId);
        return null;
      }

      return existing;
    }

    return baseAdapter.updateSession!(session);
  },
};
