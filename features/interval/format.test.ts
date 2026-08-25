import {
  formatDuration,
  formatSessionDate,
  formatWorkRestRatio,
  parsePerformedDate,
} from "./format";

const durationCases: Array<[number, string]> = [
  [0, "0:00"],
  [30, "0:30"],
  [90, "1:30"],
  [3661, "1:01:01"],
];

describe("interval formatting", () => {
  it.each(durationCases)(
    "formats %i seconds as %s",
    (seconds, expected) => {
      expect(formatDuration(seconds)).toBe(expected);
    },
  );

  it("reduces work and recovery to a display ratio", () => {
    expect(formatWorkRestRatio(30, 60)).toBe("1:2");
    expect(formatWorkRestRatio(40, 60)).toBe("2:3");
  });

  it("returns a safe fallback for invalid ratios", () => {
    expect(formatWorkRestRatio(30, 0)).toBe("—");
    expect(formatWorkRestRatio(1.5, 3)).toBe("—");
  });

  it("parses and formats performed dates using UTC", () => {
    const date = parsePerformedDate("2026-08-19");

    expect(date).toEqual(new Date("2026-08-19T00:00:00.000Z"));
    expect(formatSessionDate(date)).toBe("2026-08-19");
  });
});
