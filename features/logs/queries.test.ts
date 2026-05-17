import { prisma } from "@/lib/db";
import { getLogBySlug, getLogsPage } from "./queries";

const testRunId = `logs-test-${Date.now()}`;
const userAId = `${testRunId}-user-a`;
const userBId = `${testRunId}-user-b`;

describe("log queries", () => {
  beforeEach(async () => {
    await prisma.user.create({
      data: {
        id: userAId,
        email: `${userAId}@example.test`,
        name: "Logs Test User A",
      },
    });

    await prisma.user.create({
      data: {
        id: userBId,
        email: `${userBId}@example.test`,
        name: "Logs Test User B",
      },
    });

    await prisma.log.createMany({
      data: [
        {
          id: `${testRunId}-log-a`,
          userId: userAId,
          title: "Visible Log",
          slug: "visible-log",
        },
        {
          id: `${testRunId}-log-b`,
          userId: userBId,
          title: "Hidden Log",
          slug: "visible-log",
        },
      ],
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [userAId, userBId],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists only the signed-in user's logs", async () => {
    const result = await getLogsPage({
      userId: userAId,
      page: 1,
      limit: 12,
    });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].title).toBe("Visible Log");
    expect(result.pagination.totalItems).toBe(1);
  });

  it("finds logs by scoped user slug", async () => {
    const [userALog, userBLog] = await Promise.all([
      getLogBySlug({ userId: userAId, slug: "visible-log" }),
      getLogBySlug({ userId: userBId, slug: "visible-log" }),
    ]);

    expect(userALog?.title).toBe("Visible Log");
    expect(userBLog?.title).toBe("Hidden Log");
  });
});
