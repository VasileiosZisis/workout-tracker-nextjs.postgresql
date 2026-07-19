import { randomBytes, randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { SessionKind } from "@/generated/prisma/enums";
import { calculatePaceMetrics } from "@/features/pace/metrics";
import { calculateWeightliftingMetrics } from "@/features/weightlifting/metrics";
import { prisma } from "@/lib/db";
import { DEMO_LIFETIME_MS, DEMO_MAX_ACTIVE_USERS } from "./constants";

export class DemoCapacityError extends Error {
  constructor() {
    super("The temporary demo is currently at capacity.");
    this.name = "DemoCapacityError";
  }
}

type DemoSandboxOptions = {
  now?: Date;
  maxActiveUsers?: number;
};

type WeightliftingSeed = {
  daysAgo: number;
  sets: Array<{
    repetitions: number;
    kilograms: number;
    isHard: boolean;
  }>;
};

const benchPressHistory: WeightliftingSeed[] = [
  { daysAgo: 70, sets: setsAtWeight(70) },
  { daysAgo: 56, sets: setsAtWeight(72.5) },
  { daysAgo: 42, sets: setsAtWeight(75) },
  { daysAgo: 28, sets: setsAtWeight(77.5) },
  { daysAgo: 14, sets: setsAtWeight(80) },
  { daysAgo: 2, sets: setsAtWeight(82.5) },
];

const backSquatHistory: WeightliftingSeed[] = [
  { daysAgo: 63, sets: setsAtWeight(95) },
  { daysAgo: 42, sets: setsAtWeight(100) },
  { daysAgo: 21, sets: setsAtWeight(105) },
  { daysAgo: 3, sets: setsAtWeight(110) },
];

const tempoRunHistory = [
  { daysAgo: 70, minutes: 27, seconds: 30 },
  { daysAgo: 56, minutes: 26, seconds: 48 },
  { daysAgo: 42, minutes: 26, seconds: 12 },
  { daysAgo: 28, minutes: 25, seconds: 45 },
  { daysAgo: 14, minutes: 25, seconds: 18 },
  { daysAgo: 1, minutes: 24, seconds: 52 },
];

function setsAtWeight(kilograms: number) {
  return [
    { repetitions: 8, kilograms, isHard: false },
    { repetitions: 8, kilograms, isHard: true },
    { repetitions: 6, kilograms, isHard: true },
  ];
}

function performedAt(now: Date, daysAgo: number) {
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
}

function decimalString(value: number, digits = 2) {
  return value.toFixed(digits);
}

async function createWeightliftingHistory({
  tx,
  userId,
  logId,
  exerciseId,
  now,
  history,
}: {
  tx: Prisma.TransactionClient;
  userId: string;
  logId: string;
  exerciseId: string;
  now: Date;
  history: WeightliftingSeed[];
}) {
  const sessions = history.map((entry) => {
    const metrics = calculateWeightliftingMetrics(entry.sets);

    return {
      id: randomUUID(),
      session: {
        userId,
        logId,
        exerciseId,
        performedAt: performedAt(now, entry.daysAgo),
        totalVolume: decimalString(metrics.totalVolume),
        junkVolume: decimalString(metrics.junkVolume),
        workingVolume: decimalString(metrics.workingVolume),
      },
      sets: metrics.sets,
    };
  });

  await tx.weightliftingSession.createMany({
    data: sessions.map(({ id, session }) => ({ id, ...session })),
  });
  await tx.weightliftingSet.createMany({
    data: sessions.flatMap(({ id, sets }) =>
      sets.map((set) => ({
        sessionId: id,
        position: set.position,
        repetitions: decimalString(set.repetitions),
        kilograms: decimalString(set.kilograms),
        isHard: set.isHard,
        volume: decimalString(set.volume),
      })),
    ),
  });
}

export async function createDemoSandbox({
  now = new Date(),
  maxActiveUsers = DEMO_MAX_ACTIVE_USERS,
}: DemoSandboxOptions = {}) {
  const demoExpiresAt = new Date(now.getTime() + DEMO_LIFETIME_MS);
  const sessionToken = randomBytes(32).toString("base64url");

  const user = await prisma.$transaction(
    async (tx) => {
      await tx.user.deleteMany({
        where: {
          demoExpiresAt: {
            lte: now,
          },
        },
      });

      const activeDemoUsers = await tx.user.count({
        where: {
          demoExpiresAt: {
            gt: now,
          },
        },
      });

      if (activeDemoUsers >= maxActiveUsers) {
        throw new DemoCapacityError();
      }

      const createdUser = await tx.user.create({
        data: {
          name: "Demo Athlete",
          demoExpiresAt,
        },
      });

      const strengthLog = await tx.log.create({
        data: {
          userId: createdUser.id,
          title: "Strength Training",
          slug: "strength-training",
        },
      });
      const runningLog = await tx.log.create({
        data: {
          userId: createdUser.id,
          title: "Running",
          slug: "running",
        },
      });

      const benchPress = await tx.exercise.create({
        data: {
          userId: createdUser.id,
          logId: strengthLog.id,
          title: "Bench Press",
          slug: "bench-press",
          sessionKind: SessionKind.WEIGHTLIFTING,
        },
      });
      const backSquat = await tx.exercise.create({
        data: {
          userId: createdUser.id,
          logId: strengthLog.id,
          title: "Back Squat",
          slug: "back-squat",
          sessionKind: SessionKind.WEIGHTLIFTING,
        },
      });
      const tempoRun = await tx.exercise.create({
        data: {
          userId: createdUser.id,
          logId: runningLog.id,
          title: "5K Tempo Run",
          slug: "5k-tempo-run",
          sessionKind: SessionKind.PACE,
        },
      });

      await createWeightliftingHistory({
        tx,
        userId: createdUser.id,
        logId: strengthLog.id,
        exerciseId: benchPress.id,
        now,
        history: benchPressHistory,
      });
      await createWeightliftingHistory({
        tx,
        userId: createdUser.id,
        logId: strengthLog.id,
        exerciseId: backSquat.id,
        now,
        history: backSquatHistory,
      });

      await tx.paceSession.createMany({
        data: tempoRunHistory.map((entry) => {
          const metrics = calculatePaceMetrics({
            hours: 0,
            minutes: entry.minutes,
            seconds: entry.seconds,
            distance: 5,
          });

          return {
            userId: createdUser.id,
            logId: runningLog.id,
            exerciseId: tempoRun.id,
            performedAt: performedAt(now, entry.daysAgo),
            hours: metrics.hours,
            minutes: metrics.minutes,
            seconds: metrics.seconds,
            distance: decimalString(metrics.distance),
            pace: decimalString(metrics.pace, 3),
            paceMinutes: metrics.paceMinutes,
            paceSeconds: metrics.paceSeconds,
            speed: decimalString(metrics.speed, 3),
          };
        }),
      });

      await tx.session.create({
        data: {
          sessionToken,
          userId: createdUser.id,
          expires: demoExpiresAt,
        },
      });

      return createdUser;
    },
    {
      isolationLevel: "Serializable",
      maxWait: 5_000,
      timeout: 15_000,
    },
  );

  return {
    user,
    sessionToken,
    expires: demoExpiresAt,
  };
}
