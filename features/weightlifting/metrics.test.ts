import {
  calculateAverageWorkingLoad,
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
    expect(metrics.averageWorkingLoad).toBe(107.5);
    expect(metrics.sets.map((set) => set.position)).toEqual([1, 2, 3]);
  });
});

describe("calculateAverageWorkingLoad", () => {
  it("weights load by repetitions and excludes junk sets", () => {
    expect(
      calculateAverageWorkingLoad([
        { repetitions: 10, kilograms: 50, isHard: true },
        { repetitions: 1, kilograms: 100, isHard: true },
        { repetitions: 20, kilograms: 20, isHard: false },
      ]),
    ).toBe(54.55);
  });

  it("rounds only the final decimal result", () => {
    expect(
      calculateAverageWorkingLoad([
        { repetitions: 2.5, kilograms: 42.5, isHard: true },
        { repetitions: 1.5, kilograms: 57.5, isHard: true },
      ]),
    ).toBe(48.13);
  });

  it("returns null when there are no hard sets", () => {
    expect(
      calculateAverageWorkingLoad([
        { repetitions: 10, kilograms: 50, isHard: false },
      ]),
    ).toBeNull();
  });
});
