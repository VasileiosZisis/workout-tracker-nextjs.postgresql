import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  mapPaceProgressData,
  mapWeightliftingProgressData,
} from "./mapping";
import {
  getChartDateRange,
  type ChartRangeState,
} from "./date-range";

export async function getWeightliftingProgressData({
  chartRange,
  userId,
  exerciseId,
}: {
  chartRange: ChartRangeState;
  userId: string;
  exerciseId: string;
}) {
  const where = {
    userId,
    exerciseId,
    exercise: {
      sessionKind: SessionKind.WEIGHTLIFTING,
    },
  };
  const latestSession = await prisma.weightliftingSession.findFirst({
    where,
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    select: { performedAt: true },
  });
  const dateRange = getChartDateRange({
    latestPerformedAt: latestSession?.performedAt ?? null,
    range: chartRange,
  });

  const sessions = await prisma.weightliftingSession.findMany({
    where: {
      ...where,
      performedAt: dateRange
        ? {
            gte: dateRange.from,
            lt: dateRange.toExclusive,
          }
        : undefined,
    },
    select: {
      id: true,
      performedAt: true,
      totalVolume: true,
      workingVolume: true,
      junkVolume: true,
    },
    orderBy: [{ performedAt: "asc" }, { createdAt: "asc" }],
  });

  return mapWeightliftingProgressData(sessions);
}

export async function getPaceProgressData({
  chartRange,
  userId,
  exerciseId,
}: {
  chartRange: ChartRangeState;
  userId: string;
  exerciseId: string;
}) {
  const where = {
    userId,
    exerciseId,
    exercise: {
      sessionKind: SessionKind.PACE,
    },
  };
  const latestSession = await prisma.paceSession.findFirst({
    where,
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    select: { performedAt: true },
  });
  const dateRange = getChartDateRange({
    latestPerformedAt: latestSession?.performedAt ?? null,
    range: chartRange,
  });

  const sessions = await prisma.paceSession.findMany({
    where: {
      ...where,
      performedAt: dateRange
        ? {
            gte: dateRange.from,
            lt: dateRange.toExclusive,
          }
        : undefined,
    },
    select: {
      id: true,
      performedAt: true,
      distance: true,
      pace: true,
      speed: true,
    },
    orderBy: [{ performedAt: "asc" }, { createdAt: "asc" }],
  });

  return mapPaceProgressData(sessions);
}
