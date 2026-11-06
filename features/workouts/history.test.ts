import { randomUUID } from "node:crypto";
import { createWorkoutFixture } from "@/tests/fixtures/workout";
import { vi } from "vitest";
import { prisma } from "@/lib/db";
import { createHistoricalWorkout, historicalWorkoutSchema, reassignWorkoutSession } from "./history";
import { getHistoryRoutine, getSessionWorkoutCandidates, getStandaloneSessionPage, getWorkoutHistoryDetail, getWorkoutHistoryPage } from "./history-queries";
import { deleteRoutine, endEntry, lockWorkoutContext, saveRoutine, startEntry } from "./service";
import { requireUser } from "@/lib/auth";
import { deleteWeightliftingSessionAction, updateWeightliftingSessionAction } from "@/features/weightlifting/actions";

const fault = vi.hoisted(() => ({ revision: false }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));
vi.mock("@/lib/db", async (importOriginal) => {
  const { prisma: base } = await importOriginal<typeof import("@/lib/db")>();
  return { prisma: base.$extends({ query: { workoutRoutine: { update({ args, query }) {
    if (fault.revision) { fault.revision = false; throw new Error("SIMULATED_REVISION_FAILURE"); }
    return query(args);
  } } } }) };
});
vi.setConfig({ testTimeout: 45_000, hookTimeout: 30_000 });

const prefix = `workout-history-${randomUUID()}`;
const userId = `${prefix}-user`;
const logId = `${prefix}-log`;
const exerciseId = `${prefix}-exercise`;
const date = "2026-11-01";
async function routine() { return (await getHistoryRoutine(userId, logId))!; }
async function session(performedDate = date) {
  return prisma.weightliftingSession.create({ data: {
    userId, logId, exerciseId, performedAt: new Date(`${performedDate}T00:00:00.000Z`),
    totalVolume: "500", workingVolume: "500", sets: { create: { position: 1, repetitions: "10", kilograms: "50", isHard: true, volume: "500" } },
  } });
}
async function grouping(sessionIds: string[], performedDate = date, definitionIndex = 0) {
  const current = await routine();
  return { routineId: current.id, revision: current.revision, definitionId: current.definitions[definitionIndex].id, performedDate, sessionIds, requestId: randomUUID() };
}
async function assignment(sessionId: string, targetEntryId = "") {
  const current = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: sessionId } });
  return { routineId: (await routine()).id, sessionId, targetEntryId, expectedEntryId: current.workoutEntryId ?? "", expectedUpdatedAt: current.updatedAt.toISOString() };
}
async function active() {
  const current = await routine();
  return prisma.$transaction(async (tx) => {
    const context = await lockWorkoutContext(tx, userId, logId);
    return startEntry(tx, userId, logId, context, { routineId: current.id, revision: current.revision, nextId: context!.nextDefinitionId!, date, requestId: randomUUID() });
  });
}
async function training(sessionId: string) {
  return prisma.weightliftingSession.findUniqueOrThrow({ where: { id: sessionId }, select: {
    performedAt: true, totalVolume: true, workingVolume: true, junkVolume: true, sets: { orderBy: { position: "asc" } },
  } });
}

describe("workout history and corrections", () => {
  beforeEach(async () => {
    fault.revision = false;
    vi.mocked(requireUser).mockResolvedValue({ id: userId, role: "USER", isDemo: false, demoExpiresAt: null });
    await prisma.user.create({ data: { id: userId } });
    await prisma.log.create({ data: { id: logId, userId, title: "Strength", slug: "strength" } });
    await prisma.exercise.create({ data: { id: exerciseId, userId, logId, title: "Squat", slug: "squat", sessionKind: "WEIGHTLIFTING" } });
    await createWorkoutFixture(userId, logId, ["A", "B", "C"].map((name) => ({ name })));
  });
  afterEach(async () => { fault.revision = false; await prisma.user.deleteMany({ where: { id: userId } }); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("paginates across weeks and same-date ties, excluding discarded entries", async () => {
    const dates = ["2026-10-20", date, date];
    const ids: string[] = [];
    for (const [index, performedDate] of dates.entries()) {
      const saved = await session(performedDate);
      ids.push((await createHistoricalWorkout(userId, logId, await grouping([saved.id], performedDate, index))).id);
    }
    await prisma.workoutEntry.updateMany({ where: { id: { in: ids.slice(1) } }, data: { createdAt: new Date("2026-11-02T00:00:00.000Z") } });
    const discarded = await active(); await endEntry(userId, logId, discarded.id, true);
    const expected = [...ids.slice(1)].sort().reverse().concat(ids[0]);
    const result = await getWorkoutHistoryPage(userId, logId, 1, 1);
    expect(result.pagination.totalItems).toBe(3);
    expect(result.entries.map((entry) => entry.id)).toEqual(expected.slice(0, 1));
    expect(result.entries[0]._count.sessions).toBe(1);
    expect((await getWorkoutHistoryPage(userId, logId, 2, 1)).entries[0].id).toBe(expected[1]);
    expect((await getWorkoutHistoryPage(userId, logId, 3, 1)).entries[0].id).toBe(ids[0]);
    expect(await getWorkoutHistoryDetail(userId, logId, discarded.id, 1, 12)).toBeNull();
  });

  it("shares the slug namespace between starts and historical grouping", async () => {
    const running = await active();
    const saved = await session();
    const input = await grouping([saved.id]);
    const historical = await createHistoricalWorkout(userId, logId, input);
    expect(running.slug).toBe(`a-${date}`);
    expect(historical.slug).toBe(`a-${date}-2`);
    expect((await createHistoricalWorkout(userId, logId, input)).slug).toBe(historical.slug);
    expect((await getWorkoutHistoryDetail(userId, logId, historical.slug, 1, 12))?.entry.id).toBe(historical.id);
  });

  it("keeps archived names and empty completed entries without altering training or rotation", async () => {
    const saved = await session();
    const before = await training(saved.id);
    const entry = await createHistoricalWorkout(userId, logId, await grouping([saved.id]));
    const current = await routine();
    await saveRoutine(userId, logId, { name: "Renamed split", revision: current.revision, workouts: current.definitions.slice(1).map((definition) => ({ ...definition, name: `New ${definition.name}` })), nextId: current.definitions[1].id });
    await reassignWorkoutSession(userId, logId, await assignment(saved.id));
    const empty = (await getWorkoutHistoryDetail(userId, logId, entry.id, 1, 12))!;
    expect(empty.entry.name).toBe("A"); expect(empty.entry.status).toBe("COMPLETED");
    expect(empty.pagination.totalItems).toBe(0);
    expect((await getWorkoutHistoryPage(userId, logId, 1, 12)).entries[0]._count.sessions).toBe(0);
    await reassignWorkoutSession(userId, logId, await assignment(saved.id, entry.id));
    expect((await getWorkoutHistoryDetail(userId, logId, entry.id, 1, 12))!.sessions[0].id).toBe(saved.id);
    expect(await training(saved.id)).toEqual(before);
    expect((await prisma.workoutRoutine.findUniqueOrThrow({ where: { id: current.id } })).nextDefinitionId).toBe(current.definitions[1].id);
    expect(await prisma.workoutExercise.count({ where: { definition: { routineId: current.id } } })).toBe(0);
  });

  it("groups while another entry is active and moves sessions among active/completed/standalone", async () => {
    const running = await active();
    const saved = await session(); const other = await session();
    const before = await training(saved.id);
    const pointer = (await prisma.workoutRoutine.findUniqueOrThrow({ where: { logId } })).nextDefinitionId;
    const completed = await createHistoricalWorkout(userId, logId, await grouping([other.id], date, 1));
    await reassignWorkoutSession(userId, logId, await assignment(saved.id, running.id));
    await reassignWorkoutSession(userId, logId, await assignment(saved.id, completed.id));
    await expect(endEntry(userId, logId, running.id, false)).rejects.toThrow("at least one");
    await reassignWorkoutSession(userId, logId, await assignment(saved.id));
    expect(await training(saved.id)).toEqual(before);
    const state = await prisma.workoutRoutine.findUniqueOrThrow({ where: { logId } });
    expect(state.nextDefinitionId).toBe(pointer);
    expect((await prisma.workoutEntry.findUniqueOrThrow({ where: { id: running.id } })).status).toBe("IN_PROGRESS");
    expect(await prisma.workoutExercise.count({ where: { definition: { routineId: state.id } } })).toBe(0);
  });

  it("deduplicates creation requests and rejects changed replays without undoing later corrections", async () => {
    const first = await session(); const second = await session();
    const input = await grouping([first.id, second.id]);
    const [created, retry] = await Promise.all([createHistoricalWorkout(userId, logId, input), createHistoricalWorkout(userId, logId, input)]);
    expect(retry.id).toBe(created.id);
    await reassignWorkoutSession(userId, logId, await assignment(first.id));
    expect((await createHistoricalWorkout(userId, logId, { ...input, sessionIds: [...input.sessionIds].reverse() })).id).toBe(created.id);
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: first.id } })).workoutEntryId).toBeNull();
    await expect(createHistoricalWorkout(userId, logId, { ...input, sessionIds: [second.id] })).rejects.toThrow("different inputs");
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(1);
  });

  it("rejects empty/duplicate/mixed-date/nonstandalone grouping selections atomically", async () => {
    const first = await session(); const nextDay = await session("2026-11-02");
    const input = await grouping([first.id]);
    expect(historicalWorkoutSchema.safeParse({ ...input, sessionIds: [] }).success).toBe(false);
    expect(historicalWorkoutSchema.safeParse({ ...input, sessionIds: [first.id, first.id] }).success).toBe(false);
    await expect(createHistoricalWorkout(userId, logId, { ...input, sessionIds: [first.id, nextDay.id] })).rejects.toThrow("standalone sessions");
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(0);
    await createHistoricalWorkout(userId, logId, input);
    await expect(createHistoricalWorkout(userId, logId, await grouping([first.id]))).rejects.toThrow("standalone sessions");
    expect((await getStandaloneSessionPage(userId, logId, "2026-11-02", 1, 12)).sessions.map((item) => item.id)).toEqual([nextDay.id]);
  });

  it("rejects wrong-date/discarded targets and stale association or timestamp", async () => {
    const saved = await session(); const other = await session("2026-11-02");
    const wrongDate = await createHistoricalWorkout(userId, logId, await grouping([other.id], "2026-11-02"));
    await expect(reassignWorkoutSession(userId, logId, await assignment(saved.id, wrongDate.id))).rejects.toThrow("session's date");
    const discarded = await active(); await endEntry(userId, logId, discarded.id, true);
    await expect(reassignWorkoutSession(userId, logId, await assignment(saved.id, discarded.id))).rejects.toThrow("session's date");
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id } })).workoutEntryId).toBeNull();
    expect((await prisma.workoutEntry.findUniqueOrThrow({ where: { id: discarded.id } })).status).toBe("DISCARDED");
    const target = await active();
    const stale = await assignment(saved.id, target.id);
    await prisma.weightliftingSession.update({ where: { id: saved.id }, data: { updatedAt: new Date(new Date(stale.expectedUpdatedAt).getTime() + 1000) } });
    await expect(reassignWorkoutSession(userId, logId, stale)).rejects.toThrow("session changed");
    const beforeMove = await assignment(saved.id, target.id);
    await reassignWorkoutSession(userId, logId, beforeMove);
    await expect(reassignWorkoutSession(userId, logId, { ...beforeMove, expectedUpdatedAt: (await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id } })).updatedAt.toISOString() })).rejects.toThrow("session changed");
    const choices = await getSessionWorkoutCandidates(userId, logId, new Date(`${date}T00:00:00.000Z`), null, 1, 12);
    expect(choices.entries.map((item) => item.id)).toEqual([target.id]);
  });

  it("rolls back grouping and reassignment if the final revision write fails", async () => {
    const saved = await session(); const input = await grouping([saved.id]);
    const before = await training(saved.id);
    fault.revision = true;
    await expect(createHistoricalWorkout(userId, logId, input)).rejects.toThrow("SIMULATED_REVISION_FAILURE");
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(0);
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id } })).workoutEntryId).toBeNull();
    expect((await routine()).revision).toBe(input.revision);
    const entry = await createHistoricalWorkout(userId, logId, input);
    fault.revision = true;
    await expect(reassignWorkoutSession(userId, logId, await assignment(saved.id))).rejects.toThrow("SIMULATED_REVISION_FAILURE");
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id } })).workoutEntryId).toBe(entry.id);
    expect(await training(saved.id)).toEqual(before);
  });

  it("serializes Finish against a correction that removes the last active session", async () => {
    const running = await active(); const saved = await session();
    await reassignWorkoutSession(userId, logId, await assignment(saved.id, running.id));
    const before = await training(saved.id);
    const moveInput = await assignment(saved.id);
    const [finish, move] = await Promise.allSettled([endEntry(userId, logId, running.id, false), reassignWorkoutSession(userId, logId, moveInput)]);
    expect(move.status).toBe("fulfilled");
    const entry = await prisma.workoutEntry.findUniqueOrThrow({ where: { id: running.id } });
    if (finish.status === "fulfilled") expect(entry.status).toBe("COMPLETED");
    else { expect((finish.reason as Error).message).toContain("at least one"); expect(entry.status).toBe("IN_PROGRESS"); }
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id } })).workoutEntryId).toBeNull();
    expect(await training(saved.id)).toEqual(before);
  });

  it("protects replacement state when deletion races an association correction", async () => {
    const saved = await session(); const entry = await createHistoricalWorkout(userId, logId, await grouping([saved.id]));
    const current = await routine(); const before = await training(saved.id);
    const moveInput = await assignment(saved.id);
    const [deletion, move] = await Promise.allSettled([deleteRoutine(userId, logId, current.id, current.revision), reassignWorkoutSession(userId, logId, moveInput)]);
    if (deletion.status === "fulfilled") {
      expect(move.status).toBe("rejected");
      if (move.status === "rejected") expect((move.reason as Error).message).toContain("routine changed");
      expect(await getHistoryRoutine(userId, logId)).toBeNull();
      expect(await getWorkoutHistoryDetail(userId, logId, entry.id, 1, 12)).toBeNull();
    } else {
      expect((deletion.reason as Error).message).toContain("changed"); expect(move.status).toBe("fulfilled");
    }
    expect(await training(saved.id)).toEqual(before);
  });

  it("serializes discard against reassignment without losing the recorded session", async () => {
    const running = await active(); const saved = await session(); const other = await session();
    const target = await createHistoricalWorkout(userId, logId, await grouping([other.id], date, 1));
    await reassignWorkoutSession(userId, logId, await assignment(saved.id, running.id));
    const moveInput = await assignment(saved.id, target.id); const before = await training(saved.id);
    const [discard, move] = await Promise.allSettled([endEntry(userId, logId, running.id, true), reassignWorkoutSession(userId, logId, moveInput)]);
    expect(discard.status).toBe("fulfilled");
    const kept = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id } });
    if (move.status === "fulfilled") expect(kept.workoutEntryId).toBe(target.id);
    else { expect((move.reason as Error).message).toContain("session changed"); expect(kept.workoutEntryId).toBeNull(); }
    expect(await training(saved.id)).toEqual(before);
    expect((await prisma.workoutEntry.findUniqueOrThrow({ where: { id: running.id } })).status).toBe("DISCARDED");
  });

  it("rejects stale correction or edit when a set edit races reassignment", async () => {
    const saved = await session(); const entry = await createHistoricalWorkout(userId, logId, await grouping([saved.id]));
    await prisma.weightliftingSession.update({ where: { id: saved.id }, data: { updatedAt: new Date("2026-01-01") } });
    const moveInput = await assignment(saved.id);
    const edit = new FormData(); edit.set("sessionId", saved.id); edit.set("performedDate", date); edit.set("workoutSelection", entry.id);
    edit.set("setCount", "1"); edit.set("sets.0.repetitions", "10"); edit.set("sets.0.kilograms", "60"); edit.set("sets.0.isHard", "on");
    const [edited, moved] = await Promise.allSettled([updateWeightliftingSessionAction({}, edit), reassignWorkoutSession(userId, logId, moveInput)]);
    const kept = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id }, include: { sets: true } });
    if (edited.status === "rejected") {
      expect((edited.reason as Error).message).toContain("NEXT_REDIRECT");
      expect(moved.status).toBe("rejected");
      if (moved.status === "rejected") expect((moved.reason as Error).message).toContain("session changed");
      expect(kept.workoutEntryId).toBe(entry.id); expect(Number(kept.workingVolume)).toBe(600); expect(Number(kept.sets[0].kilograms)).toBe(60);
    } else {
      expect(edited.value.fieldErrors?.workoutSelection).toBeDefined(); expect(moved.status).toBe("fulfilled");
      expect(kept.workoutEntryId).toBeNull(); expect(Number(kept.workingVolume)).toBe(500); expect(Number(kept.sets[0].kilograms)).toBe(50);
    }
  });

  it("allows explicit next selection while idle and rejects it while active", async () => {
    const current = await routine();
    await saveRoutine(userId, logId, { name: "Split", revision: current.revision, workouts: current.definitions, nextId: current.definitions[2].id });
    expect((await prisma.workoutRoutine.findUniqueOrThrow({ where: { logId } })).nextDefinitionId).toBe(current.definitions[2].id);
    const running = await active(); expect(running.name).toBe("C");
    await expect(saveRoutine(userId, logId, { name: "Split", revision: (await routine()).revision, workouts: current.definitions, nextId: current.definitions[0].id })).rejects.toThrow("active workout");
  });

  it("rejects stale grouping forms after the next-workout selection changes", async () => {
    const saved = await session(); const input = await grouping([saved.id]); const current = await routine();
    await saveRoutine(userId, logId, { name: "Split", revision: current.revision, workouts: current.definitions, nextId: current.definitions[1].id });
    await expect(createHistoricalWorkout(userId, logId, input)).rejects.toThrow("routine changed");
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(0);
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: saved.id } })).workoutEntryId).toBeNull();
  });

  it("never resurrects a session when deletion races its workout correction", async () => {
    const saved = await session(); const entry = await createHistoricalWorkout(userId, logId, await grouping([saved.id]));
    const moveInput = await assignment(saved.id); const remove = new FormData(); remove.set("sessionId", saved.id);
    const before = await prisma.workoutRoutine.findUniqueOrThrow({ where: { logId } });
    const [deletion, move] = await Promise.allSettled([deleteWeightliftingSessionAction(remove), reassignWorkoutSession(userId, logId, moveInput)]);
    expect(deletion.status).toBe("rejected");
    if (deletion.status === "rejected") expect((deletion.reason as Error).message).toContain("NEXT_REDIRECT");
    if (move.status === "rejected") expect((move.reason as Error).message).toContain("Session not found");
    expect(await prisma.weightliftingSession.count({ where: { id: saved.id } })).toBe(0);
    expect(await prisma.weightliftingSet.count({ where: { sessionId: saved.id } })).toBe(0);
    expect((await getWorkoutHistoryDetail(userId, logId, entry.id, 1, 12))!.pagination.totalItems).toBe(0);
    expect((await prisma.workoutRoutine.findUniqueOrThrow({ where: { logId } })).nextDefinitionId).toBe(before.nextDefinitionId);
  });

  it("isolates session IDs, target entries, queries, and grouping across users and logs", async () => {
    const foreignUser = `${prefix}-demo`;
    const otherLog = `${prefix}-other-log`;
    try {
      await prisma.user.create({ data: { id: foreignUser, demoExpiresAt: new Date(Date.now() + 3600000) } });
      await prisma.log.create({ data: { id: otherLog, userId: foreignUser, title: "Other", slug: "other" } });
      await saveRoutine(foreignUser, otherLog, { name: "Other", revision: 0, workouts: [{ id: "new:D", name: "D" }], nextId: "new:D" });
      await prisma.exercise.create({ data: { id: `${prefix}-foreign-exercise`, userId: foreignUser, logId: otherLog, title: "Foreign", slug: "foreign", sessionKind: "WEIGHTLIFTING" } });
      const foreignSession = await prisma.weightliftingSession.create({ data: { userId: foreignUser, logId: otherLog, exerciseId: `${prefix}-foreign-exercise`, performedAt: new Date(`${date}T00:00:00.000Z`) } });
      const foreign = await prisma.workoutEntry.create({ data: { userId: foreignUser, logId: otherLog, routineId: (await getHistoryRoutine(foreignUser, otherLog))!.id, definitionId: (await getHistoryRoutine(foreignUser, otherLog))!.definitions[0].id, name: "D", slug: "foreign-fixture", status: "COMPLETED", performedAt: new Date(`${date}T00:00:00.000Z`), requestId: randomUUID() } });
      const saved = await session(); const input = await grouping([saved.id]);
      await expect(createHistoricalWorkout(foreignUser, logId, input)).rejects.toThrow("Log not found");
      await expect(createHistoricalWorkout(userId, logId, { ...input, sessionIds: [saved.id, foreignSession.id] })).rejects.toThrow("standalone sessions");
      expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(0);
      expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: foreignSession.id } })).workoutEntryId).toBeNull();
      await expect(reassignWorkoutSession(userId, logId, await assignment(saved.id, foreign.id))).rejects.toThrow("session's date");
      const own = await createHistoricalWorkout(userId, logId, input);
      expect(await getWorkoutHistoryDetail(foreignUser, logId, own.id, 1, 12)).toBeNull();
      expect(await getWorkoutHistoryDetail(foreignUser, logId, own.slug, 1, 12)).toBeNull();
      expect((await getWorkoutHistoryPage(userId, otherLog, 1, 12)).entries).toHaveLength(0);
      expect((await getSessionWorkoutCandidates(userId, otherLog, new Date(`${date}T00:00:00.000Z`), null, 1, 12)).entries).toHaveLength(0);
      await prisma.log.create({ data: { id: `${prefix}-same-user`, userId, title: "Second", slug: "second" } });
      expect(await getWorkoutHistoryDetail(userId, `${prefix}-same-user`, own.slug, 1, 12)).toBeNull();
      await saveRoutine(userId, `${prefix}-same-user`, { name: "Second", revision: 0, workouts: [{ id: "new:S", name: "S" }], nextId: "new:S" });
      await prisma.exercise.create({ data: { id: `${prefix}-cross-log-exercise`, userId, logId: `${prefix}-same-user`, title: "Second", slug: "second", sessionKind: "WEIGHTLIFTING" } });
      const crossLogSession = await prisma.weightliftingSession.create({ data: { userId, logId: `${prefix}-same-user`, exerciseId: `${prefix}-cross-log-exercise`, performedAt: new Date(`${date}T00:00:00.000Z`) } });
      await expect(createHistoricalWorkout(userId, logId, await grouping([crossLogSession.id]))).rejects.toThrow("standalone sessions");
      expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: crossLogSession.id } })).workoutEntryId).toBeNull();
      await expect(reassignWorkoutSession(userId, `${prefix}-same-user`, { ...(await assignment(saved.id)), routineId: (await getHistoryRoutine(userId, `${prefix}-same-user`))!.id })).rejects.toThrow("Session not found");
    } finally { await prisma.user.deleteMany({ where: { id: foreignUser } }); }
  });
});
