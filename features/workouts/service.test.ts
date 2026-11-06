import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { prisma } from "@/lib/db";
import { endEntry, lockWorkoutContext, saveRoutine, startEntry } from "./service";
import { getWorkoutPanel } from "./queries";

// Multi-step integration workflows include remote database latency.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const prefix = `workout-service-${randomUUID()}`;
const userId = `${prefix}-user`;
const logId = `${prefix}-log`;
const otherUserId = `${prefix}-other`;
const otherLogId = `${prefix}-other-log`;

async function panel() { return (await getWorkoutPanel(userId, logId))!; }
async function setup() {
  await saveRoutine(userId, logId, { name: "Split", revision: 0, workouts: ["A", "B", "C"].map((name) => ({ id: `new:${name}`, name })), nextId: "new:A" });
  return panel();
}
async function start(date = "2026-10-26", requestId = randomUUID(), snapshot?: Awaited<ReturnType<typeof panel>>) {
  const current = snapshot ?? await panel();
  return prisma.$transaction(async (tx) => {
    const context = await lockWorkoutContext(tx, userId, logId);
    return startEntry(tx, userId, logId, context, { routineId: current.id, revision: current.revision, nextId: current.nextId, date, requestId });
  });
}
async function addSession(entryId: string) {
  const entry = await prisma.workoutEntry.findUniqueOrThrow({ where: { id: entryId } });
  return prisma.weightliftingSession.create({ data: { userId, logId, exerciseId: `${prefix}-exercise`, performedAt: entry.performedAt, workoutEntryId: entryId } });
}

describe("continuous workout lifecycle", () => {
  beforeEach(async () => {
    await prisma.user.create({ data: { id: userId } });
    await prisma.user.create({ data: { id: otherUserId, demoExpiresAt: new Date(Date.now() + 3600000) } });
    await prisma.log.create({ data: { id: logId, userId, title: "Strength", slug: "strength" } });
    await prisma.log.create({ data: { id: otherLogId, userId: otherUserId, title: "Demo", slug: "demo" } });
    await prisma.exercise.create({ data: { id: `${prefix}-exercise`, userId, logId, title: "Squat", slug: "squat", sessionKind: "WEIGHTLIFTING" } });
  });
  afterEach(async () => { await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } }); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("starts on a chosen step and never resets at a week boundary", async () => {
    await saveRoutine(userId, logId, { name: "Split", revision: 0, workouts: ["A", "B", "C"].map((name) => ({ id: `new:${name}`, name })), nextId: "new:C" });
    const entry = await start("2026-12-21");
    expect(entry.name).toBe("C");
    await addSession(entry.id);
    await endEntry(userId, logId, entry.id, false);
    expect((await start("2027-02-01")).name).toBe("A");
  });
  it("retries Start and Finish without creating entries or advancing twice", async () => {
    const current = await setup();
    const requestId = randomUUID();
    const [first, retry] = await Promise.all([start(undefined, requestId, current), start(undefined, requestId, current)]);
    expect(first.id).toBe(retry.id);
    await addSession(first.id);
    await Promise.all([endEntry(userId, logId, first.id, false), endEntry(userId, logId, first.id, false)]);
    expect((await panel()).nextId).toBe(current.definitions[1].id);
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(1);
    expect((await start(undefined, requestId, current)).status).toBe("COMPLETED");
    expect((await panel()).active).toBeNull();
  });
  it("rejects concurrent distinct starts and stale setup revisions", async () => {
    const current = await setup();
    const results = await Promise.allSettled([start(undefined, randomUUID(), current), start(undefined, randomUUID(), current)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.workoutEntry.count({ where: { logId, status: "IN_PROGRESS" } })).toBe(1);
    await expect(saveRoutine(userId, logId, { name: "Changed", revision: current.revision, workouts: current.definitions, nextId: current.nextId })).rejects.toThrow();
  });
  it("will not finish an empty workout; discard preserves sessions and the next step", async () => {
    const current = await setup();
    const entry = await start();
    await expect(endEntry(userId, logId, entry.id, false)).rejects.toThrow("at least one");
    const session = await addSession(entry.id);
    await endEntry(userId, logId, entry.id, true);
    await endEntry(userId, logId, entry.id, true);
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: session.id } })).workoutEntryId).toBeNull();
    expect((await panel()).nextId).toBe(current.nextId);
    await expect(endEntry(userId, logId, entry.id, false)).rejects.toThrow("already ended");
  });
  it("archives removed steps and preserves completed names during idle editing", async () => {
    const initial = await setup();
    const entry = await start();
    await addSession(entry.id);
    await endEntry(userId, logId, entry.id, false);
    const current = await panel();
    await saveRoutine(userId, logId, { name: "New split", revision: current.revision, workouts: [...current.definitions].reverse().filter((item) => item.id !== initial.nextId).map((item) => ({ ...item, name: `New ${item.name}` })), nextId: current.nextId });
    expect((await panel()).nextId).toBe(current.nextId);
    expect((await prisma.workoutDefinition.findUniqueOrThrow({ where: { id: initial.nextId } })).archived).toBe(true);
    expect((await prisma.workoutEntry.findUniqueOrThrow({ where: { id: entry.id } })).name).toBe("A");
    await expect(saveRoutine(userId, logId, { name: "Stale", revision: current.revision, workouts: current.definitions, nextId: current.nextId })).rejects.toThrow("changed");
  });
  it("requires a replacement if the next step is removed and rejects a foreign definition", async () => {
    const current = await setup();
    const remaining = current.definitions.slice(1);
    await expect(saveRoutine(userId, logId, { name: "Split", revision: current.revision, workouts: remaining, nextId: current.nextId })).rejects.toThrow();
    await expect(saveRoutine(userId, logId, { name: "Split", revision: current.revision, workouts: [{ id: "foreign", name: "Other" }], nextId: "foreign" })).rejects.toThrow("belongs");
    await saveRoutine(userId, logId, { name: "Split", revision: current.revision, workouts: remaining, nextId: remaining[0].id });
    expect((await panel()).nextId).toBe(remaining[0].id);
  });
  it("isolates users, logs, and demo users and cascades cleanup", async () => {
    await setup();
    const entry = await start();
    await expect(endEntry(otherUserId, logId, entry.id, true)).rejects.toThrow("Log not found");
    await expect(endEntry(otherUserId, otherLogId, entry.id, true)).rejects.toThrow("Workout not found");
    expect(await getWorkoutPanel(otherUserId, logId)).toBeNull();
    await saveRoutine(otherUserId, otherLogId, { name: "Demo", revision: 0, workouts: [{ id: "new:D", name: "D" }], nextId: "new:D" });
    await prisma.user.delete({ where: { id: otherUserId } });
    expect(await prisma.workoutRoutine.count({ where: { userId: otherUserId } })).toBe(0);
    await prisma.log.delete({ where: { id: logId } });
    expect(await prisma.workoutRoutine.count({ where: { userId } })).toBe(0);
    expect(await prisma.workoutEntry.count({ where: { userId } })).toBe(0);
  });
});
