import { calculatePaceMetrics, calculateTotalMinutes } from "./metrics";

describe("calculateTotalMinutes", () => {
  it("calculates total minutes from hours, minutes, and seconds", () => {
    expect(
      calculateTotalMinutes({
        hours: 1,
        minutes: 2,
        seconds: 30,
        distance: 10,
      }),
    ).toBe(62.5);
  });
});

describe("calculatePaceMetrics", () => {
  it("calculates pace, pace parts, and speed", () => {
    const metrics = calculatePaceMetrics({
      hours: 0,
      minutes: 25,
      seconds: 0,
      distance: 5,
    });

    expect(metrics.totalMinutes).toBe(25);
    expect(metrics.pace).toBe(5);
    expect(metrics.paceMinutes).toBe(5);
    expect(metrics.paceSeconds).toBe(0);
    expect(metrics.speed).toBe(12);
  });

  it("handles fractional pace seconds", () => {
    const metrics = calculatePaceMetrics({
      hours: 0,
      minutes: 20,
      seconds: 30,
      distance: 4,
    });

    expect(metrics.pace).toBe(5.125);
    expect(metrics.paceMinutes).toBe(5);
    expect(metrics.paceSeconds).toBe(8);
    expect(metrics.speed).toBe(11.707);
  });

  it("handles zero distance safely", () => {
    const metrics = calculatePaceMetrics({
      hours: 0,
      minutes: 20,
      seconds: 0,
      distance: 0,
    });

    expect(metrics.pace).toBe(0);
    expect(metrics.paceMinutes).toBe(0);
    expect(metrics.paceSeconds).toBe(0);
    expect(metrics.speed).toBe(0);
  });

  it("handles zero time safely", () => {
    const metrics = calculatePaceMetrics({
      hours: 0,
      minutes: 0,
      seconds: 0,
      distance: 5,
    });

    expect(metrics.totalMinutes).toBe(0);
    expect(metrics.pace).toBe(0);
    expect(metrics.speed).toBe(0);
  });
});
