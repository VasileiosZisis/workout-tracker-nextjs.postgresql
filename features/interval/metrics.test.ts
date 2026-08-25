import {
  calculateDurationSeconds,
  calculateIntervalMetrics,
} from "./metrics";

describe("calculateDurationSeconds", () => {
  it("converts minutes and seconds to total seconds", () => {
    expect(calculateDurationSeconds(2, 30)).toBe(150);
  });
});

describe("calculateIntervalMetrics", () => {
  it("excludes recovery after the final round by default", () => {
    const metrics = calculateIntervalMetrics({
      rounds: 10,
      workMinutes: 0,
      workSecondsPart: 30,
      recoveryMinutes: 1,
      recoverySecondsPart: 0,
      includeFinalRecovery: false,
    });

    expect(metrics).toEqual({
      rounds: 10,
      workSeconds: 30,
      recoverySeconds: 60,
      includeFinalRecovery: false,
      recoveryCount: 9,
      totalWorkSeconds: 300,
      totalRecoverySeconds: 540,
      intervalBlockSeconds: 840,
      numericWorkRestRatio: 0.5,
    });
  });

  it("includes recovery after the final round when selected", () => {
    const metrics = calculateIntervalMetrics({
      rounds: 10,
      workMinutes: 0,
      workSecondsPart: 30,
      recoveryMinutes: 1,
      recoverySecondsPart: 0,
      includeFinalRecovery: true,
    });

    expect(metrics.recoveryCount).toBe(10);
    expect(metrics.totalWorkSeconds).toBe(300);
    expect(metrics.totalRecoverySeconds).toBe(600);
    expect(metrics.intervalBlockSeconds).toBe(900);
  });

  it("calculates totals from multi-minute intervals", () => {
    const metrics = calculateIntervalMetrics({
      rounds: 4,
      workMinutes: 1,
      workSecondsPart: 30,
      recoveryMinutes: 0,
      recoverySecondsPart: 45,
      includeFinalRecovery: false,
    });

    expect(metrics.workSeconds).toBe(90);
    expect(metrics.recoverySeconds).toBe(45);
    expect(metrics.totalWorkSeconds).toBe(360);
    expect(metrics.totalRecoverySeconds).toBe(135);
    expect(metrics.intervalBlockSeconds).toBe(495);
    expect(metrics.numericWorkRestRatio).toBe(2);
  });

  it("avoids an invalid numeric ratio for unvalidated zero recovery", () => {
    const metrics = calculateIntervalMetrics({
      rounds: 2,
      workMinutes: 0,
      workSecondsPart: 30,
      recoveryMinutes: 0,
      recoverySecondsPart: 0,
      includeFinalRecovery: false,
    });

    expect(metrics.numericWorkRestRatio).toBe(0);
  });
});
