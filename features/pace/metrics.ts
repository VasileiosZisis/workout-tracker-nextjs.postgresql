export type PaceInput = {
  hours: number;
  minutes: number;
  seconds: number;
  distance: number;
};

export type PaceMetrics = PaceInput & {
  totalMinutes: number;
  pace: number;
  paceMinutes: number;
  paceSeconds: number;
  speed: number;
};

function roundToThree(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function calculateTotalMinutes({ hours, minutes, seconds }: PaceInput) {
  return roundToThree(hours * 60 + minutes + seconds / 60);
}

export function calculatePaceMetrics(input: PaceInput): PaceMetrics {
  const totalMinutes = calculateTotalMinutes(input);
  const pace =
    input.distance > 0 ? roundToThree(totalMinutes / input.distance) : 0;
  const paceMinutes = Math.floor(pace);
  const paceSeconds = Math.round((pace - paceMinutes) * 60);
  const speed =
    totalMinutes > 0 ? roundToThree(input.distance / (totalMinutes / 60)) : 0;

  return {
    ...input,
    totalMinutes,
    pace,
    paceMinutes,
    paceSeconds,
    speed,
  };
}
