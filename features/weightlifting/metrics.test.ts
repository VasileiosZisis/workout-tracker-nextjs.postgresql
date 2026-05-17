import {
  calculateSetVolume,
  calculateWeightliftingMetrics,
} from "./metrics";

describe("calculateSetVolume", () => {
  it("calculates set volume from reps and kilograms", () => {
    expect(calculateSetVolume({ repetitions: 8, kilograms: 100 })).toBe(800);
    expect(calculateSetVolume({ repetitions: 2.5, kilograms: 42.5 })).toBe(
      106.25,
    );
  });
});

describe("calculateWeightliftingMetrics", () => {
  it("calculates total, working, and junk volume", () => {
    const metrics = calculateWeightliftingMetrics([
      { repetitions: 10, kilograms: 50, isHard: false },
      { repetitions: 5, kilograms: 100, isHard: true },
      { repetitions: 3, kilograms: 120, isHard: true },
    ]);

    expect(metrics.totalVolume).toBe(1360);
    expect(metrics.junkVolume).toBe(500);
    expect(metrics.workingVolume).toBe(860);
    expect(metrics.sets.map((set) => set.position)).toEqual([1, 2, 3]);
  });
});
