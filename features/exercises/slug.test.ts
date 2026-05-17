import { createUniqueExerciseSlug, slugifyExerciseTitle } from "./slug";

describe("slugifyExerciseTitle", () => {
  it("creates URL-safe slugs from exercise titles", () => {
    expect(slugifyExerciseTitle("  Bench Press  ")).toBe("bench-press");
    expect(slugifyExerciseTitle("Tempo_Run - Week 1")).toBe("tempo-run-week-1");
  });

  it("falls back when no sluggable characters exist", () => {
    expect(slugifyExerciseTitle("   ")).toBe("exercise");
  });
});

describe("createUniqueExerciseSlug", () => {
  it("returns the base slug when it is unused", () => {
    expect(createUniqueExerciseSlug("bench-press", ["squat"])).toBe("bench-press");
  });

  it("adds the next numeric suffix when needed", () => {
    expect(
      createUniqueExerciseSlug("bench-press", ["bench-press", "bench-press-2"]),
    ).toBe("bench-press-3");
  });
});
