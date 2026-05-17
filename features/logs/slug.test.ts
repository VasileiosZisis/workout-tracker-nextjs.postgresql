import { createUniqueSlug, slugifyTitle } from "./slug";

describe("slugifyTitle", () => {
  it("creates URL-safe slugs from log titles", () => {
    expect(slugifyTitle("  Upper Body Plan  ")).toBe("upper-body-plan");
    expect(slugifyTitle("Goal_2026 - Phase 1")).toBe("goal-2026-phase-1");
  });

  it("falls back when no sluggable characters exist", () => {
    expect(slugifyTitle("   ")).toBe("log");
  });
});

describe("createUniqueSlug", () => {
  it("returns the base slug when it is unused", () => {
    expect(createUniqueSlug("upper-body", ["lower-body"])).toBe("upper-body");
  });

  it("adds the next numeric suffix when needed", () => {
    expect(createUniqueSlug("upper-body", ["upper-body", "upper-body-2"])).toBe(
      "upper-body-3",
    );
  });
});
