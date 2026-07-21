import {
  mapPaceProgressData,
  mapWeightliftingProgressData,
} from "./mapping";

function decimal(value: string) {
  return {
    toString: () => value,
  };
}

describe("mapWeightliftingProgressData", () => {
  it("maps sessions into chart-safe numeric volume points", () => {
    const data = mapWeightliftingProgressData([
      {
        id: "session-1",
        performedAt: new Date("2026-05-17T00:00:00.000Z"),
        totalVolume: decimal("1000.00"),
        workingVolume: decimal("600.00"),
        junkVolume: decimal("400.00"),
      },
    ]);

    expect(data).toEqual([
      {
        id: "session-1",
        date: "2026-05-17",
        totalVolume: 1000,
        workingVolume: 600,
        junkVolume: 400,
      },
    ]);
  });
});

describe("mapPaceProgressData", () => {
  it("maps sessions into chart-safe numeric pace points", () => {
    const data = mapPaceProgressData([
      {
        id: "session-1",
        performedAt: new Date("2026-05-17T00:00:00.000Z"),
        distance: decimal("5.00"),
        pace: decimal("5.125"),
        speed: decimal("11.707"),
      },
    ]);

    expect(data).toEqual([
      {
        id: "session-1",
        date: "2026-05-17",
        distance: 5,
        pace: 5.125,
        paceSecondsPerKm: 308,
        speed: 11.707,
      },
    ]);
  });
});
