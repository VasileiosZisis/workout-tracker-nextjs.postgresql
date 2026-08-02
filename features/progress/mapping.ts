import { calculateAverageWorkingLoad } from "@/features/weightlifting/metrics";

type DecimalLike = {
  toString(): string;
};

type WeightliftingSessionForChart = {
  id: string;
  performedAt: Date;
  totalVolume: DecimalLike;
  workingVolume: DecimalLike;
  junkVolume: DecimalLike;
  sets: {
    position: number;
    repetitions: DecimalLike;
    kilograms: DecimalLike;
    isHard: boolean;
    volume: DecimalLike;
  }[];
};

type PaceSessionForChart = {
  id: string;
  performedAt: Date;
  hours: number;
  minutes: number;
  seconds: number;
  distance: DecimalLike;
  pace: DecimalLike;
  speed: DecimalLike;
};

function toNumber(value: DecimalLike | number) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function toDateLabel(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function mapWeightliftingProgressData(
  sessions: WeightliftingSessionForChart[],
) {
  return sessions.map((session) => {
    const numericSets = session.sets.map((set) => ({
      position: set.position,
      repetitions: toNumber(set.repetitions),
      kilograms: toNumber(set.kilograms),
      isHard: set.isHard,
      volume: toNumber(set.volume),
    }));

    return {
      id: session.id,
      date: toDateLabel(session.performedAt),
      totalVolume: toNumber(session.totalVolume),
      workingVolume: toNumber(session.workingVolume),
      junkVolume: toNumber(session.junkVolume),
      averageWorkingLoad: calculateAverageWorkingLoad(numericSets),
      sets: numericSets.map(({ isHard, ...set }) => ({
        ...set,
        averageWorkingLoad: isHard ? set.kilograms : null,
        type: isHard ? "Hard" : "Junk",
      })),
    };
  });
}

export function mapPaceProgressData(sessions: PaceSessionForChart[]) {
  return sessions.map((session) => ({
    id: session.id,
    date: toDateLabel(session.performedAt),
    time: `${session.hours}h ${session.minutes}m ${session.seconds}s`,
    distance: toNumber(session.distance),
    pace: toNumber(session.pace),
    paceSecondsPerKm: Math.round(toNumber(session.pace) * 60),
    speed: toNumber(session.speed),
  }));
}

export type WeightliftingProgressPoint = ReturnType<
  typeof mapWeightliftingProgressData
>[number];

export type PaceProgressPoint = ReturnType<typeof mapPaceProgressData>[number];
