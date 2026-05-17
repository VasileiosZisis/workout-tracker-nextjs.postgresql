import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  mapPaceProgressData,
  mapWeightliftingProgressData,
} from "./mapping";

const CHART_SESSION_LIMIT = 50;

export async function getWeightliftingProgressData({
  userId,
  exerciseId,
}: {
  userId: string;
  exerciseId: string;
}) {
  const sessions = await prisma.weightliftingSession.findMany({
    where: {
      userId,
      exerciseId,
      exercise: {
        sessionKind: SessionKind.WEIGHTLIFTING,
      },
    },
    select: {
      id: true,
      performedAt: true,
      totalVolume: true,
      workingVolume: true,
      junkVolume: true,
    },
    orderBy: [{ performedAt: "asc" }, { createdAt: "asc" }],
    take: CHART_SESSION_LIMIT,
  });

  return mapWeightliftingProgressData(sessions);
}

export async function getPaceProgressData({
  userId,
  exerciseId,
}: {
  userId: string;
  exerciseId: string;
}) {
  const sessions = await prisma.paceSession.findMany({
    where: {
      userId,
      exerciseId,
      exercise: {
        sessionKind: SessionKind.PACE,
      },
    },
    select: {
      id: true,
      performedAt: true,
      distance: true,
      pace: true,
      speed: true,
    },
    orderBy: [{ performedAt: "asc" }, { createdAt: "asc" }],
    take: CHART_SESSION_LIMIT,
  });

  return mapPaceProgressData(sessions);
}
