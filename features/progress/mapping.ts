type DecimalLike = {
  toString(): string;
};

type WeightliftingSessionForChart = {
  id: string;
  performedAt: Date;
  totalVolume: DecimalLike;
  workingVolume: DecimalLike;
  junkVolume: DecimalLike;
};

type PaceSessionForChart = {
  id: string;
  performedAt: Date;
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
  return sessions.map((session) => ({
    id: session.id,
    date: toDateLabel(session.performedAt),
    totalVolume: toNumber(session.totalVolume),
    workingVolume: toNumber(session.workingVolume),
    junkVolume: toNumber(session.junkVolume),
  }));
}

export function mapPaceProgressData(sessions: PaceSessionForChart[]) {
  return sessions.map((session) => ({
    id: session.id,
    date: toDateLabel(session.performedAt),
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
