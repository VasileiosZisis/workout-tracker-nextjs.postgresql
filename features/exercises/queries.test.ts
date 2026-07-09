import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  getExerciseBySlug,
  getExercisesPage,
  getExistingExerciseSlugs,
} from "./queries";

const testRunId = `exercises-test-${Date.now()}`;
const userAId = `${testRunId}-user-a`;
const userBId = `${testRunId}-user-b`;
const userALogId = `${testRunId}-log-a`;
const userBLogId = `${testRunId}-log-b`;

describe("exercise queries", () => {
  beforeEach(async () => {
    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: `${userAId}@example.test`,
          name: "Exercises Test User A",
        },
        {
          id: userBId,
          email: `${userBId}@example.test`,
          name: "Exercises Test User B",
        },
      ],
    });

    await prisma.log.createMany({
      data: [
        {
          id: userALogId,
          userId: userAId,
          title: "Visible Log",
          slug: "visible-log",
        },
        {
          id: userBLogId,
          userId: userBId,
          title: "Hidden Log",
          slug: "visible-log",
        },
      ],
    });

    await prisma.exercise.createMany({
      data: [
        {
          id: `${testRunId}-exercise-a`,
          userId: userAId,
          logId: userALogId,
          title: "Visible Exercise",
          slug: "bench-press",
          sessionKind: SessionKind.WEIGHTLIFTING,
        },
        {
          id: `${testRunId}-exercise-b`,
          userId: userBId,
          logId: userBLogId,
          title: "Hidden Exercise",
          slug: "bench-press",
          sessionKind: SessionKind.PACE,
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

  it("lists only exercises in the requested signed-in user's log", async () => {
    const { exercises, pagination } = await getExercisesPage({
      userId: userAId,
      logId: userALogId,
      page: 1,
      limit: 12,
    });

    expect(exercises).toHaveLength(1);
    expect(exercises[0].title).toBe("Visible Exercise");
    expect(pagination).toEqual({
      page: 1,
      limit: 12,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it("paginates exercises within the requested signed-in user's log", async () => {
    await prisma.exercise.create({
      data: {
        id: `${testRunId}-exercise-a-2`,
        userId: userAId,
        logId: userALogId,
        title: "Second Visible Exercise",
        slug: "squat",
        sessionKind: SessionKind.WEIGHTLIFTING,
      },
    });

    const [firstPage, secondPage] = await Promise.all([
      getExercisesPage({
        userId: userAId,
        logId: userALogId,
        page: 1,
        limit: 1,
      }),
      getExercisesPage({
        userId: userAId,
        logId: userALogId,
        page: 2,
        limit: 1,
      }),
    ]);

    expect(firstPage.exercises).toHaveLength(1);
    expect(secondPage.exercises).toHaveLength(1);
    expect(firstPage.exercises[0].id).not.toBe(secondPage.exercises[0].id);
    expect(firstPage.pagination).toEqual({
      page: 1,
      limit: 1,
      totalItems: 2,
      totalPages: 2,
    });
    expect(secondPage.pagination.page).toBe(2);
  });

  it("finds exercises by scoped user, log slug, and exercise slug", async () => {
    const [userAExercise, userBExercise] = await Promise.all([
      getExerciseBySlug({
        userId: userAId,
        logSlug: "visible-log",
        exerciseSlug: "bench-press",
      }),
      getExerciseBySlug({
        userId: userBId,
        logSlug: "visible-log",
        exerciseSlug: "bench-press",
      }),
    ]);

    expect(userAExercise?.title).toBe("Visible Exercise");
    expect(userBExercise?.title).toBe("Hidden Exercise");
  });

  it("returns existing slugs scoped to a user log", async () => {
    const slugs = await getExistingExerciseSlugs({
      userId: userAId,
      logId: userALogId,
    });

    expect(slugs).toEqual(["bench-press"]);
  });
});
