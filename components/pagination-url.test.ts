import { buildPaginationHref } from "./pagination-url";

describe("buildPaginationHref", () => {
  it("preserves chart filters while changing pagination", () => {
    expect(
      buildPaginationHref({
        baseHref: "/logs/training/exercises/bench-press",
        limit: 24,
        page: 2,
        preservedParams: {
          chartFrom: "2026-01-01",
          chartRange: "custom",
          chartTo: "2026-06-30",
        },
      }),
    ).toBe(
      "/logs/training/exercises/bench-press?chartFrom=2026-01-01&chartRange=custom&chartTo=2026-06-30&page=2&limit=24",
    );
  });

  it("ignores empty preserved parameters and owns page and limit", () => {
    expect(
      buildPaginationHref({
        baseHref: "/logs",
        limit: 12,
        page: 1,
        preservedParams: {
          chartFrom: undefined,
          limit: "48",
          page: "9",
        },
      }),
    ).toBe("/logs?limit=12&page=1");
  });
});
