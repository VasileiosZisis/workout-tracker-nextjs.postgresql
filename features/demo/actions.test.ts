import { auth } from "@/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { vi } from "vitest";
import { startDemoAction } from "./actions";
import { createDemoSandbox, DemoCapacityError } from "./service";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  authSessionCookie: {
    name: "authjs.session-token",
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
    },
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    DEMO_ENABLED: true,
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("./service", () => {
  class MockDemoCapacityError extends Error {}

  return {
    createDemoSandbox: vi.fn(),
    DemoCapacityError: MockDemoCapacityError,
  };
});

const setCookie = vi.fn();
const mockAuth = vi.mocked(
  auth as unknown as () => Promise<Session | null>,
);

describe("startDemoAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    vi.mocked(cookies).mockResolvedValue({
      set: setCookie,
    } as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  it("preserves an existing authenticated session", async () => {
    mockAuth.mockResolvedValue({
      expires: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: "existing-user",
        role: "USER",
        isDemo: false,
        demoExpiresAt: null,
      },
    });

    await expect(startDemoAction()).rejects.toThrow("NEXT_REDIRECT:/logs");
    expect(createDemoSandbox).not.toHaveBeenCalled();
    expect(setCookie).not.toHaveBeenCalled();
  });

  it("creates a sandbox cookie before redirecting to logs", async () => {
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);
    vi.mocked(createDemoSandbox).mockResolvedValue({
      user: {
        id: "demo-user",
        name: "Demo Athlete",
        email: null,
        emailVerified: null,
        image: null,
        role: "USER",
        demoExpiresAt: expires,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      sessionToken: "temporary-session-token",
      expires,
    });

    await expect(startDemoAction()).rejects.toThrow("NEXT_REDIRECT:/logs");
    expect(setCookie).toHaveBeenCalledWith(
      "authjs.session-token",
      "temporary-session-token",
      expect.objectContaining({ expires, httpOnly: true }),
    );
  });

  it("redirects to a capacity state when all demo slots are in use", async () => {
    vi.mocked(createDemoSandbox).mockRejectedValue(new DemoCapacityError());

    await expect(startDemoAction()).rejects.toThrow(
      "NEXT_REDIRECT:/demo?status=capacity",
    );
    expect(setCookie).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/demo?status=capacity");
  });
});
