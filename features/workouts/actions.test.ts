import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { workoutAction } from "./actions";
import { endEntry, saveRoutine } from "./service";
import { getWorkoutSelection } from "./queries";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const prefix = `workout-action-${randomUUID()}`;
const userId = `${prefix}-user`;
const logId = `${prefix}-log`;

describe("workout actions", () => {
  beforeEach(async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: userId, role: "USER", isDemo: false, demoExpiresAt: null });
    await prisma.user.create({ data: { id: userId } });
    await prisma.log.create({ data: { id: logId, userId, title: "Strength", slug: "strength" } });
    await saveRoutine(userId, logId, { name: "Split", revision: 0, workouts: ["A", "B"].map((name) => ({ id: `new:${name}`, name })), nextId: "new:A" });
  });
  afterEach(async () => { vi.clearAllMocks(); await prisma.user.deleteMany({ where: { id: userId } }); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("starts through the panel action and enforces discard confirmation server-side", async () => {
    const current = (await getWorkoutSelection(userId, logId))!;
    const start = new FormData();
    start.set("logId", logId); start.set("operation", "start"); start.set("routineId", current.routineId);
    start.set("revision", String(current.revision)); start.set("nextId", current.nextId);
    start.set("performedDate", "2026-11-01"); start.set("requestId", randomUUID());
    expect((await workoutAction({}, start)).success).toBeDefined();
    expect((await workoutAction({}, start)).success).toBeDefined();
    const entry = (await getWorkoutSelection(userId, logId))!.active!;
    await prisma.exercise.create({ data: { id: `${prefix}-exercise`, userId, logId, title: "Squat", slug: "squat", sessionKind: "WEIGHTLIFTING" } });
    const session = await prisma.weightliftingSession.create({ data: { userId, logId, exerciseId: `${prefix}-exercise`, performedAt: new Date("2026-11-01T00:00:00.000Z"), workoutEntryId: entry.id } });
    const discard = new FormData(); discard.set("logId", logId); discard.set("operation", "discard"); discard.set("entryId", entry.id);
    expect((await workoutAction({}, discard)).error).toContain("Confirm");
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: session.id } })).workoutEntryId).toBe(entry.id);
    expect((await getWorkoutSelection(userId, logId))!.active!.id).toBe(entry.id);
    discard.set("confirmed", "yes");
    expect((await workoutAction({}, discard)).success).toBeDefined();
    expect((await workoutAction({}, discard)).success).toBeDefined();
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: session.id } })).workoutEntryId).toBeNull();
    const after = (await getWorkoutSelection(userId, logId))!;
    expect(after.nextId).toBe(current.nextId);
    expect(after.active).toBeNull();
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/logs/strength", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/routine/strength");
    expect(revalidatePath).toHaveBeenCalledWith("/routine");
  });

  it("rejects foreign logs and malformed routine input without changing the routine", async () => {
    const form = new FormData(); form.set("logId", "foreign"); form.set("operation", "start");
    expect((await workoutAction({}, form)).error).toBe("Log not found.");
    form.set("logId", logId); form.set("operation", "save"); form.set("workouts", "malformed");
    expect((await workoutAction({}, form)).error).toBeDefined();
    expect((await getWorkoutSelection(userId, logId))!.revision).toBe(1);
  });
  it("validates schedule settings and wires scheduled starts through the panel action", async () => {
    let current = (await getWorkoutSelection(userId, logId))!;
    const settings = new FormData();
    for (const [name, value] of Object.entries({ logId, operation: "saveSchedule", routineId: current.routineId, revision: String(current.revision), style: "WEEKLY", timezone: "UTC", weekStart: "1", effective: "today", expectedScheduleId: "", expectedToday: current.schedule!.today, assignments: "bad-json" })) settings.set(name, value);
    expect((await workoutAction({}, settings)).error).toContain("weekday assignments");
    settings.set("assignments", "[]");
    expect((await workoutAction({}, settings)).error).toBeDefined();
    expect(await prisma.workoutSchedule.count({ where: { routineId: current.routineId } })).toBe(0);
    settings.set("confirmed", "yes");
    settings.set("logId", "foreign");
    expect((await workoutAction({}, settings)).error).toBe("Log not found.");
    settings.set("logId", logId);
    expect((await workoutAction({}, settings)).success).toBeDefined();
    current = (await getWorkoutSelection(userId, logId))!;
    const schedule = current.schedule!;
    expect(schedule.style).toBe("WEEKLY");
    const start = new FormData();
    for (const [name, value] of Object.entries({ logId, operation: "start", routineId: current.routineId, revision: String(current.revision), nextId: current.nextId, performedDate: schedule.today, requestId: randomUUID(), schedulingIntent: "SCHEDULED", scheduleId: schedule.id, slotKey: schedule.next!.key, chosenDefinitionId: current.definitions![1].id, scheduleToday: schedule.today })) start.set(name, value);
    expect((await workoutAction({}, start)).success).toBeDefined();
    const entry = await prisma.workoutEntry.findFirstOrThrow({ where: { logId } });
    expect(entry.name).toBe("B"); expect(entry.plannedName).toBe("A");
    expect(await prisma.workoutSlot.count({ where: { entryId: entry.id } })).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/logs/strength", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/routine/strength");
  });

  it("confirms deletion, blocks active workouts, and preserves completed training data", async () => {
    const current = (await getWorkoutSelection(userId, logId))!;
    const start = new FormData();
    start.set("logId", logId); start.set("operation", "start"); start.set("routineId", current.routineId);
    start.set("revision", String(current.revision)); start.set("nextId", current.nextId);
    start.set("performedDate", "2026-11-01"); start.set("requestId", randomUUID());
    expect((await workoutAction({}, start)).success).toBeDefined();
    const active = (await getWorkoutSelection(userId, logId))!;
    const form = new FormData(); form.set("logId", logId); form.set("operation", "delete");
    form.set("routineId", active.routineId); form.set("revision", String(active.revision));
    expect((await workoutAction({}, form)).error).toContain("Confirm");
    form.set("confirmed", "yes");
    expect((await workoutAction({}, form)).error).toContain("active workout");
    await prisma.exercise.create({ data: { id: `${prefix}-exercise`, userId, logId, title: "Squat", slug: "squat", sessionKind: "WEIGHTLIFTING" } });
    const session = await prisma.weightliftingSession.create({ data: {
      userId, logId, exerciseId: `${prefix}-exercise`, performedAt: new Date("2026-11-01T00:00:00.000Z"), workoutEntryId: active.active!.id,
      totalVolume: "500", workingVolume: "500", sets: { create: { position: 1, repetitions: "10", kilograms: "50", isHard: true, volume: "500" } },
    } });
    await endEntry(userId, logId, active.active!.id, false);
    expect((await workoutAction({}, form)).error).toContain("changed");
    form.set("revision", String((await getWorkoutSelection(userId, logId))!.revision));
    expect((await workoutAction({}, form)).success).toBeDefined();
    expect((await workoutAction({}, form)).success).toBeDefined();
    expect(await getWorkoutSelection(userId, logId)).toBeNull();
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(0);
    expect(await prisma.workoutDefinition.count({ where: { routineId: active.routineId } })).toBe(0);
    const kept = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: session.id }, include: { sets: true } });
    expect(kept.workoutEntryId).toBeNull();
    expect(Number(kept.totalVolume)).toBe(500);
    expect(Number(kept.workingVolume)).toBe(500);
    expect(kept.sets).toHaveLength(1);
    expect(Number(kept.sets[0].kilograms)).toBe(50);
    expect(Number(kept.sets[0].repetitions)).toBe(10);
    expect(Number(kept.sets[0].volume)).toBe(500);
    expect(await prisma.exercise.count({ where: { id: `${prefix}-exercise` } })).toBe(1);
    await saveRoutine(userId, logId, { name: "Replacement", revision: 0, workouts: [{ id: "new:R", name: "R" }], nextId: "new:R" });
    expect((await workoutAction({}, form)).error).toContain("changed");
    expect(await getWorkoutSelection(userId, logId)).not.toBeNull();
  });

  it("rejects a routine ID from another log or user", async () => {
    const otherUserId = `${prefix}-other`;
    try {
      await prisma.user.create({ data: { id: otherUserId, demoExpiresAt: new Date(Date.now() + 3600000) } });
      await prisma.log.create({ data: { id: `${prefix}-other-log`, userId: otherUserId, title: "Other", slug: "other" } });
      await saveRoutine(otherUserId, `${prefix}-other-log`, { name: "Other", revision: 0, workouts: [{ id: "new:O", name: "O" }], nextId: "new:O" });
      const other = (await getWorkoutSelection(otherUserId, `${prefix}-other-log`))!;
      const form = new FormData(); form.set("logId", logId); form.set("operation", "delete"); form.set("confirmed", "yes");
      form.set("routineId", other.routineId); form.set("revision", String(other.revision));
      expect((await workoutAction({}, form)).error).toContain("changed");
      form.set("logId", `${prefix}-other-log`);
      expect((await workoutAction({}, form)).error).toBe("Log not found.");
      expect(await getWorkoutSelection(otherUserId, `${prefix}-other-log`)).not.toBeNull();
      expect(await getWorkoutSelection(userId, logId)).not.toBeNull();
    } finally {
      await prisma.user.deleteMany({ where: { id: otherUserId } });
    }
  });

  it("serializes deletion against a simultaneous workout start", async () => {
    const current = (await getWorkoutSelection(userId, logId))!;
    const start = new FormData();
    start.set("logId", logId); start.set("operation", "start"); start.set("routineId", current.routineId);
    start.set("revision", String(current.revision)); start.set("nextId", current.nextId);
    start.set("performedDate", "2026-11-01"); start.set("requestId", randomUUID());
    const remove = new FormData();
    remove.set("logId", logId); remove.set("operation", "delete"); remove.set("routineId", current.routineId);
    remove.set("revision", String(current.revision)); remove.set("confirmed", "yes");
    const [started, deleted] = await Promise.all([workoutAction({}, start), workoutAction({}, remove)]);
    expect(Number(Boolean(started.success)) + Number(Boolean(deleted.success))).toBe(1);
    const after = await getWorkoutSelection(userId, logId);
    if (started.success) {
      expect(deleted.error).toContain("changed");
      expect(after?.active).not.toBeNull();
      expect(after?.routineId).toBe(current.routineId);
    } else {
      expect(started.error).toContain("changed");
      expect(after).toBeNull();
      expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(0);
    }
  });
});
