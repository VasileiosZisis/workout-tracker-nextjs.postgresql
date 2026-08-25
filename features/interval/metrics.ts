export type IntervalMetricsInput = {
  rounds: number;
  workMinutes: number;
  workSecondsPart: number;
  recoveryMinutes: number;
  recoverySecondsPart: number;
  includeFinalRecovery: boolean;
};

export type IntervalMetrics = {
  rounds: number;
  workSeconds: number;
  recoverySeconds: number;
  includeFinalRecovery: boolean;
  recoveryCount: number;
  totalWorkSeconds: number;
  totalRecoverySeconds: number;
  intervalBlockSeconds: number;
  numericWorkRestRatio: number;
};

export function calculateDurationSeconds(minutes: number, seconds: number) {
  return minutes * 60 + seconds;
}

export function calculateIntervalMetrics(
  input: IntervalMetricsInput,
): IntervalMetrics {
  const workSeconds = calculateDurationSeconds(
    input.workMinutes,
    input.workSecondsPart,
  );
  const recoverySeconds = calculateDurationSeconds(
    input.recoveryMinutes,
    input.recoverySecondsPart,
  );
  const recoveryCount = input.includeFinalRecovery
    ? input.rounds
    : input.rounds - 1;
  const totalWorkSeconds = input.rounds * workSeconds;
  const totalRecoverySeconds = recoveryCount * recoverySeconds;

  return {
    rounds: input.rounds,
    workSeconds,
    recoverySeconds,
    includeFinalRecovery: input.includeFinalRecovery,
    recoveryCount,
    totalWorkSeconds,
    totalRecoverySeconds,
    intervalBlockSeconds: totalWorkSeconds + totalRecoverySeconds,
    numericWorkRestRatio:
      recoverySeconds > 0 ? workSeconds / recoverySeconds : 0,
  };
}
