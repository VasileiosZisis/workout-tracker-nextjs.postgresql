import { formatPaceSeconds, getPaddedDomain } from "./pace-progress";

describe("pace progress helpers", () => {
  it("formats pace seconds as minutes and seconds", () => {
    expect(formatPaceSeconds(608)).toBe("10:08");
  });

  it("adds a minimum domain padding for sparse data", () => {
    expect(getPaddedDomain([608], 10)).toEqual([598, 618]);
    expect(getPaddedDomain([5.7, 6], 0.1)).toEqual([5.6, 6.1]);
  });
});
