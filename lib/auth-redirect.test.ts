import { getSafeRedirectTo } from "./auth-redirect";

describe("getSafeRedirectTo", () => {
  it("keeps relative application destinations", () => {
    expect(getSafeRedirectTo("/logs/example?page=2#history")).toBe(
      "/logs/example?page=2#history",
    );
  });

  it("uses the first callback value when query parameters repeat", () => {
    expect(getSafeRedirectTo(["/profile", "/logs"])).toBe("/profile");
  });

  it("rejects absolute and protocol-relative destinations", () => {
    expect(getSafeRedirectTo("https://example.com")).toBe("/logs");
    expect(getSafeRedirectTo("//example.com/logs")).toBe("/logs");
    expect(getSafeRedirectTo("/\\example.com/logs")).toBe("/logs");
  });

  it("defaults missing callbacks to logs", () => {
    expect(getSafeRedirectTo(undefined)).toBe("/logs");
  });
});
