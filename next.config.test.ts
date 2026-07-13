import { createContentSecurityPolicy } from "./next.config";

describe("content security policy", () => {
  it("keeps production sources restricted", () => {
    const policy = createContentSecurityPolicy(false);

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("allows the Next.js development runtime", () => {
    const policy = createContentSecurityPolicy(true);

    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("ws: wss:");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
});
