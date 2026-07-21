export type PaceChartMetric = "pace" | "speed";

export function formatPaceSeconds(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const roundedSeconds = Math.round(value);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getPaddedDomain(
  values: number[],
  minimumPadding: number,
): [number, number] {
  const finiteValues = values.filter(
    (value) => Number.isFinite(value) && value >= 0,
  );

  if (finiteValues.length === 0) {
    return [0, minimumPadding * 2];
  }

  const minimum = Math.min(...finiteValues);
  const maximum = Math.max(...finiteValues);
  const padding = Math.max(minimumPadding, (maximum - minimum) * 0.1);
  const lowerBound = Math.max(0, minimum - padding);
  const upperBound = maximum + padding;

  return [
    Math.round(lowerBound * 1_000_000) / 1_000_000,
    Math.round(upperBound * 1_000_000) / 1_000_000,
  ];
}
