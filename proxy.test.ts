import { vi } from "vitest";
import { config, handleProxyRequest } from "./proxy";

vi.mock("@/auth", () => ({
  auth: <T>(handler: T) => handler,
}));

function createRequest(
  path: string,
  user?: {
    isDemo: boolean;
  },
) {
  return {
    auth: user ? { user } : null,
    nextUrl: new URL(path, "https://workouttrackr.test"),
  };
}

describe("authentication proxy", () => {
  it("redirects a regular signed-in user from the homepage to logs", () => {
    const response = handleProxyRequest(
      createRequest("/", { isDemo: false }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://workouttrackr.test/logs",
    );
  });

  it.each([
    ["a signed-out visitor", createRequest("/")],
    ["a temporary-demo user", createRequest("/", { isDemo: true })],
  ])("keeps the homepage available to %s", (_label, request) => {
    const response = handleProxyRequest(request);

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  it.each(["/privacy", "/terms"])(
    "does not redirect a regular user from %s",
    (path) => {
      const response = handleProxyRequest(
        createRequest(path, { isDemo: false }),
      );

      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it.each([
    "/logs/strength?page=2",
    "/profile?section=account",
  ])("preserves the callback URL for signed-out access to %s", (path) => {
    const response = handleProxyRequest(createRequest(path));
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("callbackUrl")).toBe(path);
  });

  it("matches only the homepage and protected application routes", () => {
    expect(config.matcher).toEqual([
      "/",
      "/logs/:path*",
      "/profile/:path*",
    ]);
  });
});
