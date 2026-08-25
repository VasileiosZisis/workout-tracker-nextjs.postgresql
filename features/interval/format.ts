export function formatSessionDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parsePerformedDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "0:00";
  }

  const normalizedSeconds = Math.floor(totalSeconds);
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    const paddedMinutes = String(minutes).padStart(2, "0");
    const paddedSeconds = String(seconds).padStart(2, "0");
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a;
}

export function formatWorkRestRatio(
  workSeconds: number,
  recoverySeconds: number,
) {
  if (
    !Number.isInteger(workSeconds) ||
    !Number.isInteger(recoverySeconds) ||
    workSeconds <= 0 ||
    recoverySeconds <= 0
  ) {
    return "—";
  }

  const divisor = greatestCommonDivisor(workSeconds, recoverySeconds);
  return `${workSeconds / divisor}:${recoverySeconds / divisor}`;
}
