import { deleteExpiredDemoUsers } from "@/features/demo/lifecycle";
import { GET } from "./route";
import { vi } from "vitest";

vi.mock("@/features/demo/lifecycle", () => ({
  deleteExpiredDemoUsers: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    CRON_SECRET: "c".repeat(32),
  },
}));

describe("demo cleanup cron route", () => {
  it("rejects requests without the cron secret", async () => {
    const response = await GET(new Request("https://example.test/api/cron/demo-cleanup"));

    expect(response.status).toBe(401);
    expect(deleteExpiredDemoUsers).not.toHaveBeenCalled();
  });

  it("deletes expired demos for an authorized request", async () => {
    vi.mocked(deleteExpiredDemoUsers).mockResolvedValue({ count: 2 });
    const response = await GET(
      new Request("https://example.test/api/cron/demo-cleanup", {
        headers: { authorization: `Bearer ${"c".repeat(32)}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deletedUsers: 2 });
  });
});
