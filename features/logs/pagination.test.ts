import {
  getPageSizeOptions,
  normalizePagination,
  parsePagination,
} from "./pagination";

describe("pagination", () => {
  it("normalizes requested limits to supported page sizes", () => {
    expect(parsePagination({ limit: "13", page: "2" })).toEqual({
      limit: 24,
      page: 2,
    });
    expect(parsePagination({ limit: "500", page: "1" }).limit).toBe(48);
  });

  it("normalizes invalid pages and bounds pages to available data", () => {
    expect(parsePagination({ page: "invalid" }).page).toBe(1);
    expect(
      normalizePagination({ limit: 1, page: 2, totalItems: 2 }),
    ).toMatchObject({ limit: 1, page: 2, skip: 1, totalPages: 2 });
    expect(
      normalizePagination({ limit: 24, page: 10, totalItems: 30 }),
    ).toMatchObject({ limit: 24, page: 2, skip: 24, totalPages: 2 });
  });

  it("offers only bounded page-size choices needed for the result count", () => {
    expect(getPageSizeOptions(12)).toEqual([]);
    expect(getPageSizeOptions(13)).toEqual([12, 24]);
    expect(getPageSizeOptions(25)).toEqual([12, 24, 48]);
    expect(getPageSizeOptions(500)).toEqual([12, 24, 48]);
  });
});
