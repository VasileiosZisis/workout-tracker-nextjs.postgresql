import { prisma } from "@/lib/db";

describe("fast test database boundary", () => {
  it("rejects real Prisma access before a query can connect", () => {
    expect(() => prisma.user).toThrow("A unit test accessed Prisma");
  });
});
